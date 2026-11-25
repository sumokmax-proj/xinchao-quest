import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { mergeByMaterial } from '../src/render/merge';

const box = (color: string, x: number, material?: THREE.Material) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material ?? new THREE.MeshLambertMaterial({ color }));
  m.position.x = x;
  return m;
};
const meshes = (o: THREE.Object3D) => {
  const out: THREE.Mesh[] = [];
  o.traverse((k) => (k as THREE.Mesh).isMesh && out.push(k as THREE.Mesh));
  return out;
};

describe('같은 재질 조각 합치기 (드로우콜 줄이기)', () => {
  it('같은 색은 하나로 합치고, 놓인 자리는 그대로', () => {
    const root = new THREE.Group();
    const nested = new THREE.Group();
    nested.position.x = 10;
    nested.add(box('#ff0000', 0));
    root.add(box('#ff0000', -5), nested);
    mergeByMaterial(root);
    const list = meshes(root);
    expect(list).toHaveLength(1);
    list[0].geometry.computeBoundingBox();
    expect(list[0].geometry.boundingBox!.min.x).toBeCloseTo(-5.5);
    expect(list[0].geometry.boundingBox!.max.x).toBeCloseTo(10.5);
  });

  it('정수로 압축된 좌표(최적화한 모델)도 모양이 잘리지 않는다', () => {
    const root = new THREE.Group();
    const m = new THREE.MeshLambertMaterial();
    for (const x of [3, 6]) {
      const geo = new THREE.BoxGeometry(1, 1, 1);
      const pos = geo.getAttribute('position');
      // -1 ~ 1 값을 int16으로 저장한 형태 (gltf-transform 양자화)
      const packed = new THREE.BufferAttribute(new Int16Array(pos.count * 3), 3, true);
      for (let i = 0; i < pos.count; i++) packed.setXYZ(i, pos.getX(i), pos.getY(i), pos.getZ(i));
      geo.setAttribute('position', packed);
      const mesh = new THREE.Mesh(geo, m);
      mesh.position.x = x;
      root.add(mesh);
    }
    mergeByMaterial(root);
    const g = meshes(root)[0].geometry;
    g.computeBoundingBox();
    expect(g.boundingBox!.min.x).toBeCloseTo(2.5, 2);
    expect(g.boundingBox!.max.x).toBeCloseTo(6.5, 2);
  });

  it('다른 색은 따로', () => {
    const root = new THREE.Group();
    root.add(box('#ff0000', 0), box('#00ff00', 1), box('#ff0000', 2));
    mergeByMaterial(root);
    expect(meshes(root)).toHaveLength(2);
  });

  it('번쩍이는 재질(keep)은 색이 같아도 다른 것과 섞지 않고, 재질 객체를 그대로 쓴다', () => {
    const root = new THREE.Group();
    const flash = new THREE.MeshLambertMaterial({ color: '#ff0000' });
    root.add(box('', 0, flash), box('', 1, flash), box('#ff0000', 2));
    mergeByMaterial(root, { keep: new Set([flash]) });
    const list = meshes(root);
    expect(list).toHaveLength(2);
    expect(list.filter((m) => m.material === flash)).toHaveLength(1);
  });

  it('따로 움직이는 부분(skip)은 건드리지 않는다', () => {
    const root = new THREE.Group();
    const arm = new THREE.Group();
    arm.add(box('#ff0000', 0));
    root.add(box('#ff0000', 1), box('#ff0000', 2), arm);
    mergeByMaterial(root, { skip: new Set([arm]) });
    expect(arm.children).toHaveLength(1);
    expect(meshes(root)).toHaveLength(2);
  });
});
