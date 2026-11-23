import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';

/**
 * 뼈대·애니메이션이 있는 glTF 모델 (KayKit 캐릭터).
 * 같은 파일은 한 번만 내려받고, 여러 개가 필요하면 복제한다 (마을 NPC).
 * 불러오기에 실패하면 null → 게임은 임시 도형 모델로 계속한다.
 */
const loader = new GLTFLoader();
const cache = new Map<string, Promise<GLTF | null>>();

function fetchModel(file: string): Promise<GLTF | null> {
  let p = cache.get(file);
  if (!p) {
    p = loader.loadAsync(import.meta.env.BASE_URL + 'models/' + file).catch(() => null);
    cache.set(file, p);
  }
  return p;
}

export interface RigOptions {
  height: number; // 게임 안에서의 키 (칸 = 1)
  hide?: string[]; // 숨길 부품 이름 (방패·두손검처럼 쓰지 않는 소품)
}

export class RiggedModel {
  readonly mixer: THREE.AnimationMixer;
  private actions = new Map<string, THREE.AnimationAction>();
  private current: THREE.AnimationAction | null = null;
  /** 맞았을 때 하얗게 번쩍일 재질 */
  readonly mats: THREE.MeshLambertMaterial[] = [];

  constructor(
    readonly root: THREE.Object3D,
    clips: THREE.AnimationClip[],
  ) {
    this.mixer = new THREE.AnimationMixer(root);
    for (const c of clips) this.actions.set(c.name, this.mixer.clipAction(c));
  }

  has(name: string): boolean {
    return this.actions.has(name);
  }

  duration(name: string): number {
    return this.actions.get(name)?.getClip().duration ?? 1;
  }

  /**
   * 애니메이션 바꾸기. once: 한 번만 재생하고 마지막 자세로 멈춤.
   * seconds를 주면 그 시간 안에 끝나도록 빠르기를 맞춘다.
   */
  play(name: string, o: { once?: boolean; seconds?: number; fade?: number; speed?: number; restart?: boolean } = {}): void {
    const a = this.actions.get(name);
    if (!a) return;
    if (a === this.current && !o.restart) {
      if (o.speed) a.timeScale = o.speed;
      return;
    }
    a.reset();
    a.setLoop(o.once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
    a.clampWhenFinished = !!o.once;
    a.timeScale = o.seconds ? a.getClip().duration / o.seconds : (o.speed ?? 1);
    const fade = o.fade ?? 0.12;
    if (this.current && this.current !== a) a.crossFadeFrom(this.current, fade, false);
    a.play();
    this.current = a;
  }

  get playing(): string | null {
    return this.current?.getClip().name ?? null;
  }

  /** 한 번만 재생하는 동작이 끝났나 */
  get finished(): boolean {
    const a = this.current;
    return !!a && a.loop === THREE.LoopOnce && !a.isRunning();
  }

  update(dt: number): void {
    this.mixer.update(dt);
  }
}

/**
 * 게임 화면과 색을 맞추기 위해 재질을 MeshLambertMaterial로 바꾼다
 * (이 게임은 색 관리를 끄고 옛 three 방식 조명을 쓴다 → 텍스처도 색 변환 없이 그대로)
 */
function toLambert(root: THREE.Object3D, out: THREE.MeshLambertMaterial[]): void {
  const made = new Map<THREE.Material, THREE.MeshLambertMaterial>();
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.castShadow = true;
    const src = m.material as THREE.MeshStandardMaterial;
    let lam = made.get(src);
    if (!lam) {
      if (src.map) src.map.colorSpace = THREE.NoColorSpace;
      lam = new THREE.MeshLambertMaterial({ map: src.map ?? null, color: src.map ? 0xffffff : src.color, emissive: 0x000000 });
      made.set(src, lam);
      out.push(lam);
    }
    m.material = lam;
  });
}

export async function loadRigged(file: string, opts: RigOptions): Promise<RiggedModel | null> {
  const gltf = await fetchModel(file);
  if (!gltf) return null;
  const root = cloneSkinned(gltf.scene);
  for (const name of opts.hide ?? []) {
    const n = root.getObjectByName(name);
    if (n) n.visible = false;
  }
  // 키를 맞춘다 (발이 바닥에 닿게)
  const box = new THREE.Box3().setFromObject(root);
  const h = box.max.y - box.min.y || 1;
  const k = opts.height / h;
  root.scale.setScalar(k);
  root.position.y = -box.min.y * k;
  const model = new RiggedModel(root, gltf.animations);
  toLambert(root, model.mats);
  return model;
}
