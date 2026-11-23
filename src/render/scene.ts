import * as THREE from 'three';
import { rand, defaultRng } from '../core/random';
import type { Grid } from '../world/Grid';
import type { Theme } from './themes';
import { prop } from './props';

/**
 * 프로토타입은 three 0.149를 썼다. 최신 three는 색·조명 계산 방식이 바뀌었으므로
 * 1) 색 관리(색 공간 변환)를 끄고 2) 빛 세기에 π(3.14)를 곱해서 옛날과 비슷한 밝기·색으로 맞춘다.
 */
THREE.ColorManagement.enabled = false;
const LEGACY_LIGHT = Math.PI;

export const mat = (color: THREE.ColorRepresentation): THREE.MeshLambertMaterial => new THREE.MeshLambertMaterial({ color });

export function createRenderer(): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'low-power' });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  return renderer;
}

export function createScene(): THREE.Scene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#1a3329');
  const hemi = new THREE.HemisphereLight(0xcfe8ff, 0x2f4a24, 0.5 * LEGACY_LIGHT);
  hemi.name = 'hemi';
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe0b0, 0.78 * LEGACY_LIGHT);
  sun.name = 'sun';
  sun.position.set(5, 12, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 40 });
  scene.add(sun);
  scene.add(sun.target);
  return scene;
}

/** 스테이지 분위기에 맞춰 하늘색·빛 색을 바꾼다 */
export function applyTheme(scene: THREE.Scene, t: Theme): void {
  (scene.background as THREE.Color).set(t.sky);
  const hemi = scene.getObjectByName('hemi') as THREE.HemisphereLight;
  hemi.color.setHex(t.hemiSky);
  hemi.groundColor.setHex(t.hemiGround);
  hemi.intensity = t.hemi * LEGACY_LIGHT;
  const sun = scene.getObjectByName('sun') as THREE.DirectionalLight;
  sun.color.setHex(t.sunColor);
  sun.intensity = t.sun * LEGACY_LIGHT;
}

const SUNK = new Set(['W', 'P']); // 물·논은 바닥이 낮다
const AWNING = ['#d6453a', '#e8b43a', '#3a8fd6', '#4fae6a'];
const FRUIT = ['#e8732a', '#f2d03a', '#c63a3a', '#7cc04a'];

/**
 * 맵 글자대로 바닥과 소품을 깐다. 돌려준 Group을 scene에서 빼면 맵이 통째로 사라진다.
 * T 나무(대나무) · R 바위 · B 덤불 · W 물 · P 논 · S 시장 좌판 · X 돌벽 · F 화로
 */
export function buildMap(scene: THREE.Scene, grid: Grid, theme: Theme): THREE.Group {
  const rng = defaultRng;
  const root = new THREE.Group();
  root.name = 'map';
  scene.add(root);
  const outer = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), mat(theme.outer));
  outer.rotation.x = -Math.PI / 2;
  outer.position.y = -0.31;
  outer.receiveShadow = true;
  root.add(outer);

  const tiles = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.3, 1), new THREE.MeshLambertMaterial({ color: 0xffffff }), grid.width * grid.height);
  const m = new THREE.Matrix4();
  const col = new THREE.Color();
  let i = 0;
  for (let r = 0; r < grid.height; r++)
    for (let c = 0; c < grid.width; c++) {
      const ch = grid.tileAt(c, r) ?? '.';
      m.makeTranslation(grid.worldX(c), SUNK.has(ch) ? -0.36 : -0.15, grid.worldZ(r));
      tiles.setMatrixAt(i, m);
      if (SUNK.has(ch)) col.set(theme.water);
      else col.set(ch === 'T' || ch === 'X' ? theme.edge : theme.ground[(r + c) % 2]);
      col.offsetHSL(0, 0, (rng() - 0.5) * 0.03);
      tiles.setColorAt(i, col);
      i++;
    }
  tiles.receiveShadow = true;
  root.add(tiles);

  const trunkG = new THREE.CylinderGeometry(0.1, 0.14, 0.45, 6);
  const coneG = new THREE.ConeGeometry(0.46, 0.95, 7);
  const roundG = new THREE.IcosahedronGeometry(0.44, 0);
  const rockG = new THREE.DodecahedronGeometry(0.36, 0);
  const bushG = new THREE.IcosahedronGeometry(0.34, 0);
  const caneG = new THREE.CylinderGeometry(0.055, 0.065, 1.7, 5);
  const bLeafG = new THREE.ConeGeometry(0.2, 0.42, 5);
  const riceG = new THREE.ConeGeometry(0.07, 0.34, 4);
  const boxG = new THREE.BoxGeometry(1, 1, 1);
  const fruitG = new THREE.IcosahedronGeometry(0.08, 0);
  const trunkM = mat(theme.trunk);
  const leafA = mat(theme.leaf[0]);
  const leafB = mat(theme.leaf[1]);
  const rockM = mat(theme.rock);
  const bushM = mat(theme.bush);
  const waterM = new THREE.MeshLambertMaterial({ color: theme.water, transparent: true, opacity: 0.55 });
  const riceM = mat('#8ccf4a');
  const woodM = mat('#7a5232');
  const wallM = mat('#56535c');
  const wallTopM = mat('#6d6a74');
  const metalM = mat('#3a3436');
  const flameM = new THREE.MeshBasicMaterial({ color: '#ffb040' });
  const awningM = AWNING.map((c) => mat(c));
  const fruitM = FRUIT.map((c) => mat(c));

  const paddies: [number, number][] = [];
  const add = (o: THREE.Object3D, x: number, z: number) => {
    o.position.x += x;
    o.position.z += z;
    o.traverse((k) => {
      k.castShadow = true;
    });
    root.add(o);
  };

  for (let r = 0; r < grid.height; r++)
    for (let c = 0; c < grid.width; c++) {
      const ch = grid.tileAt(c, r);
      const x = grid.worldX(c);
      const z = grid.worldZ(r);
      if (ch === 'T' && theme.tree === 'bamboo') {
        const g = new THREE.Group();
        const n = 2 + Math.floor(rng() * 2);
        for (let k = 0; k < n; k++) {
          const ox = rand(rng, -0.25, 0.25);
          const oz = rand(rng, -0.25, 0.25);
          const h = rand(rng, 0.8, 1.15);
          const cane = new THREE.Mesh(caneG, trunkM);
          cane.scale.y = h;
          cane.position.set(ox, 0.85 * h, oz);
          cane.rotation.z = rand(rng, -0.08, 0.08);
          g.add(cane);
          const leaf = new THREE.Mesh(bLeafG, rng() < 0.5 ? leafA : leafB);
          leaf.position.set(ox, 1.7 * h, oz);
          g.add(leaf);
        }
        add(g, x, z);
      } else if (ch === 'T' && prop('tree_single_A')) {
        const t = prop(rng() < 0.5 ? 'tree_single_A' : 'tree_single_B')!;
        t.position.set(rand(rng, -0.08, 0.08), 0, rand(rng, -0.08, 0.08));
        t.rotation.y = rand(rng, 0, 6);
        t.scale.setScalar(rand(rng, 0.85, 1.1));
        add(t, x, z);
      } else if (ch === 'T') {
        const g = new THREE.Group();
        const trunk = new THREE.Mesh(trunkG, trunkM);
        trunk.position.y = 0.22;
        g.add(trunk);
        const round = rng() < 0.4;
        const leaf = new THREE.Mesh(round ? roundG : coneG, rng() < 0.5 ? leafA : leafB);
        leaf.position.y = round ? 0.78 : 0.85;
        g.add(leaf);
        g.position.set(rand(rng, -0.08, 0.08), 0, rand(rng, -0.08, 0.08));
        g.scale.setScalar(rand(rng, 0.85, 1.1));
        g.rotation.y = rand(rng, 0, 6);
        add(g, x, z);
      } else if (ch === 'R' && prop('rock_single_A')) {
        const names = ['rock_single_A', 'rock_single_B', 'rock_single_C'];
        const t = prop(names[Math.floor(rng() * names.length)])!;
        t.rotation.y = rand(rng, 0, 6);
        add(t, x, z);
      } else if (ch === 'R') {
        const rock = new THREE.Mesh(rockG, rockM);
        rock.position.set(0, 0.2, 0);
        rock.scale.set(1, 0.72, 1);
        rock.rotation.y = rand(rng, 0, 6);
        rock.receiveShadow = true;
        add(rock, x, z);
      } else if (ch === 'B') {
        const bush = new THREE.Mesh(bushG, bushM);
        bush.position.set(0, 0.25, 0);
        bush.scale.set(1.1, 0.85, 1.1);
        add(bush, x, z);
      } else if (ch === 'W' || ch === 'P') {
        const water = new THREE.Mesh(boxG, waterM);
        water.scale.set(1, 0.02, 1);
        water.position.set(x, -0.08, z);
        water.receiveShadow = true;
        root.add(water);
        if (ch === 'P') paddies.push([x, z]);
      } else if (ch === 'S') {
        const g = new THREE.Group();
        const table = new THREE.Mesh(boxG, woodM);
        table.scale.set(0.9, 0.42, 0.72);
        table.position.y = 0.21;
        g.add(table);
        const awn = new THREE.Mesh(boxG, awningM[Math.floor(rng() * awningM.length)]);
        // 천막은 뒤쪽 절반만 (위에서 봐도 앞의 과일 좌판이 보이게)
        awn.scale.set(1.0, 0.05, 0.42);
        awn.position.set(0, 1.0, -0.24);
        awn.rotation.x = -0.3;
        g.add(awn);
        for (const px of [-0.42, 0.42]) {
          const pole = new THREE.Mesh(trunkG, woodM);
          pole.scale.set(0.35, 2, 0.35);
          pole.position.set(px, 0.45, -0.3);
          g.add(pole);
        }
        for (let k = 0; k < 5; k++) {
          const f = new THREE.Mesh(fruitG, fruitM[Math.floor(rng() * fruitM.length)]);
          f.position.set(rand(rng, -0.32, 0.32), 0.48, rand(rng, -0.22, 0.22));
          g.add(f);
        }
        add(g, x, z);
      } else if (ch === 'X') {
        const g = new THREE.Group();
        const h = rand(rng, 0.85, 1.05);
        const wall = new THREE.Mesh(boxG, wallM);
        wall.scale.set(1, h, 1);
        wall.position.y = h / 2;
        g.add(wall);
        const top = new THREE.Mesh(boxG, wallTopM);
        top.scale.set(0.96, 0.08, 0.96);
        top.position.y = h + 0.04;
        g.add(top);
        add(g, x, z);
      } else if (ch === 'F') {
        const g = new THREE.Group();
        const bowl = new THREE.Mesh(trunkG, metalM);
        bowl.scale.set(2.2, 1.2, 2.2);
        bowl.position.y = 0.27;
        g.add(bowl);
        const flame = new THREE.Mesh(coneG, flameM);
        flame.scale.set(0.45, 0.6, 0.45);
        flame.position.y = 0.8;
        g.add(flame);
        add(g, x, z);
        flame.castShadow = false;
        const light = new THREE.PointLight(0xff8a3a, 1.6 * LEGACY_LIGHT, 5, 1.6);
        light.position.set(x, 1, z);
        root.add(light);
      }
    }

  // 논의 벼는 개수가 많아서 한 번에 그린다 (InstancedMesh)
  if (paddies.length) {
    const per = 6;
    const rice = new THREE.InstancedMesh(riceG, riceM, paddies.length * per);
    let k = 0;
    for (const [x, z] of paddies)
      for (let n = 0; n < per; n++) {
        m.makeTranslation(x + ((n % 3) - 1) * 0.3 + rand(rng, -0.05, 0.05), 0.05, z + (Math.floor(n / 3) - 0.5) * 0.45 + rand(rng, -0.05, 0.05));
        rice.setMatrixAt(k++, m);
      }
    root.add(rice);
  }
  return root;
}

/** 맵을 통째로 치우고 GPU 메모리도 돌려준다 */
export function disposeMap(scene: THREE.Scene, root: THREE.Group): void {
  scene.remove(root);
  const geos = new Set<THREE.BufferGeometry>();
  const mats = new Set<THREE.Material>();
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.userData.shared) return; // 소품 원본과 같이 쓰는 것
    if (mesh.geometry) geos.add(mesh.geometry);
    const mm = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mm)) mm.forEach((x) => mats.add(x));
    else if (mm) mats.add(mm);
  });
  geos.forEach((g) => g.dispose());
  mats.forEach((x) => x.dispose());
}
