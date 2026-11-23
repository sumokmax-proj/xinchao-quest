import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * 지형 소품 (KayKit Medieval Hexagon Pack의 나무·바위, CC0). public/models/nature.glb 하나에 들어 있다.
 * 게임 시작 전에 한 번 불러 두고(30KB), 맵을 그릴 때 복제해서 쓴다. 못 불러오면 도형으로 그린다.
 */
const templates = new Map<string, THREE.Object3D>();

/** 소품 종류별 게임 안 크기 (높이, 칸 = 1) */
const HEIGHT: Record<string, number> = {
  tree_single_A: 1.35,
  tree_single_B: 1.2,
  rock_single_A: 0.42,
  rock_single_B: 0.5,
  rock_single_C: 0.38,
};

export async function loadProps(timeoutMs = 4000): Promise<void> {
  const url = import.meta.env.BASE_URL + 'models/nature.glb';
  const load = new GLTFLoader().loadAsync(url).catch(() => null);
  const timeout = new Promise<null>((r) => setTimeout(() => r(null), timeoutMs));
  const gltf = await Promise.race([load, timeout]);
  if (!gltf) return;
  const mats = new Map<THREE.Material, THREE.Material>();
  for (const [name, h] of Object.entries(HEIGHT)) {
    const node = gltf.scene.getObjectByName(name);
    if (!node) continue;
    const t = node.clone();
    t.position.set(0, 0, 0);
    t.rotation.set(0, 0, 0);
    t.scale.set(1, 1, 1);
    t.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = true;
      m.receiveShadow = true;
      m.userData.shared = true; // 맵을 치울 때 지우지 않는다 (여러 맵이 같이 씀)
      // 이 게임의 색 처리(색 관리 끔)에 맞춰 Lambert 재질로
      const src = m.material as THREE.MeshStandardMaterial;
      let lam = mats.get(src);
      if (!lam) {
        if (src.map) src.map.colorSpace = THREE.NoColorSpace;
        lam = new THREE.MeshLambertMaterial({ map: src.map ?? null, color: src.map ? 0xffffff : src.color });
        mats.set(src, lam);
      }
      m.material = lam;
    });
    const box = new THREE.Box3().setFromObject(t);
    const k = h / (box.max.y - box.min.y || 1);
    const wrap = new THREE.Group();
    t.scale.setScalar(k);
    t.position.set(-((box.min.x + box.max.x) / 2) * k, -box.min.y * k, -((box.min.z + box.max.z) / 2) * k);
    wrap.add(t);
    templates.set(name, wrap);
  }
}

/** 소품 하나 복제 (없으면 null → 도형으로 그린다) */
export function prop(name: string): THREE.Object3D | null {
  const t = templates.get(name);
  return t ? t.clone() : null;
}

export const hasProps = (): boolean => templates.size > 0;
