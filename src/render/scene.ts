import * as THREE from 'three';
import { rand, defaultRng } from '../core/random';
import type { Grid } from '../world/Grid';

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
  scene.add(new THREE.HemisphereLight(0xcfe8ff, 0x2f4a24, 0.5 * LEGACY_LIGHT));
  const sun = new THREE.DirectionalLight(0xffe0b0, 0.78 * LEGACY_LIGHT);
  sun.position.set(5, 12, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 40 });
  scene.add(sun);
  scene.add(sun.target);
  return scene;
}

/** 바닥 타일, 나무(T), 바위(R), 덤불(B)을 맵 글자대로 깐다 */
export function buildMap(scene: THREE.Scene, grid: Grid): void {
  const rng = defaultRng;
  const outer = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), mat('#2c4a2a'));
  outer.rotation.x = -Math.PI / 2;
  outer.position.y = -0.31;
  outer.receiveShadow = true;
  scene.add(outer);

  const tiles = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.3, 1), new THREE.MeshLambertMaterial({ color: 0xffffff }), grid.width * grid.height);
  const m = new THREE.Matrix4();
  const col = new THREE.Color();
  let i = 0;
  for (let r = 0; r < grid.height; r++)
    for (let c = 0; c < grid.width; c++) {
      m.makeTranslation(grid.worldX(c), -0.15, grid.worldZ(r));
      tiles.setMatrixAt(i, m);
      const edge = grid.tileAt(c, r) === 'T';
      col.set(edge ? '#4f7f3c' : (r + c) % 2 ? '#5a9442' : '#64a04a');
      col.offsetHSL(0, 0, (rng() - 0.5) * 0.03);
      tiles.setColorAt(i, col);
      i++;
    }
  tiles.receiveShadow = true;
  scene.add(tiles);

  const trunkG = new THREE.CylinderGeometry(0.1, 0.14, 0.45, 6);
  const coneG = new THREE.ConeGeometry(0.46, 0.95, 7);
  const roundG = new THREE.IcosahedronGeometry(0.44, 0);
  const rockG = new THREE.DodecahedronGeometry(0.36, 0);
  const bushG = new THREE.IcosahedronGeometry(0.34, 0);
  const trunkM = mat('#7a4e2d');
  const leafA = mat('#2f6b34');
  const leafB = mat('#3f8a3c');
  const rockM = mat('#8d918c');
  const bushM = mat('#5aa04a');

  for (let r = 0; r < grid.height; r++)
    for (let c = 0; c < grid.width; c++) {
      const ch = grid.tileAt(c, r);
      const x = grid.worldX(c);
      const z = grid.worldZ(r);
      if (ch === 'T') {
        const g = new THREE.Group();
        const trunk = new THREE.Mesh(trunkG, trunkM);
        trunk.position.y = 0.22;
        g.add(trunk);
        const round = rng() < 0.4;
        const leaf = new THREE.Mesh(round ? roundG : coneG, rng() < 0.5 ? leafA : leafB);
        leaf.position.y = round ? 0.78 : 0.85;
        g.add(leaf);
        g.position.set(x + rand(rng, -0.08, 0.08), 0, z + rand(rng, -0.08, 0.08));
        g.scale.setScalar(rand(rng, 0.85, 1.1));
        g.rotation.y = rand(rng, 0, 6);
        g.traverse((o) => {
          o.castShadow = true;
        });
        scene.add(g);
      } else if (ch === 'R') {
        const rock = new THREE.Mesh(rockG, rockM);
        rock.position.set(x, 0.2, z);
        rock.scale.set(1, 0.72, 1);
        rock.rotation.y = rand(rng, 0, 6);
        rock.castShadow = true;
        rock.receiveShadow = true;
        scene.add(rock);
      } else if (ch === 'B') {
        const bush = new THREE.Mesh(bushG, bushM);
        bush.position.set(x, 0.25, z);
        bush.scale.set(1.1, 0.85, 1.1);
        bush.castShadow = true;
        scene.add(bush);
      }
    }
}
