import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * 같은 재질의 조각들을 하나의 메시로 합친다 → 그리기 횟수(드로우콜)가 크게 줄어 폰이 덜 힘들다.
 * 보이는 모양은 그대로다. 합친 뒤에는 조각을 하나씩 움직일 수 없으므로,
 * 따로 움직이는 부분(몬스터의 팔·별)은 skip에 넣고 그 안에서 따로 합친다.
 * keep: 게임이 값을 바꾸는 재질(맞으면 번쩍이는 것). 색이 같아도 다른 재질과 섞지 않는다.
 */
export function mergeByMaterial(parent: THREE.Object3D, opts: { skip?: ReadonlySet<THREE.Object3D>; keep?: ReadonlySet<THREE.Material> } = {}): void {
  parent.updateWorldMatrix(true, true);
  const toParent = parent.matrixWorld.clone().invert();
  const groups = new Map<string, THREE.Mesh[]>();

  const visit = (o: THREE.Object3D) => {
    if (opts.skip?.has(o)) return;
    const mesh = o as THREE.Mesh;
    const special = (o as THREE.InstancedMesh).isInstancedMesh || (o as THREE.SkinnedMesh).isSkinnedMesh;
    if (mesh.isMesh && !special && !Array.isArray(mesh.material) && o.children.length === 0) {
      const key = `${materialKey(mesh.material, opts.keep)}|${mesh.castShadow}|${mesh.receiveShadow}`;
      const list = groups.get(key);
      if (list) list.push(mesh);
      else groups.set(key, [mesh]);
    }
    for (const child of o.children) visit(child);
  };
  for (const child of parent.children) visit(child);

  for (const meshes of groups.values()) {
    if (meshes.length < 2) continue;
    const material = meshes[0].material as THREE.Material & { map?: THREE.Texture | null };
    const parts = meshes.map((m) => {
      const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
      // 합치려면 모든 조각의 속성이 같아야 한다: 위치·방향(+ 그림이 있으면 uv)만 남긴다
      for (const name of Object.keys(g.attributes)) {
        if (name !== 'position' && name !== 'normal' && !(name === 'uv' && material.map)) g.deleteAttribute(name);
      }
      for (const name of Object.keys(g.attributes)) g.setAttribute(name, toFloat(g.getAttribute(name) as THREE.BufferAttribute));
      g.morphAttributes = {};
      g.clearGroups();
      return g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(toParent, m.matrixWorld));
    });
    const geometry = mergeGeometries(parts);
    parts.forEach((g) => g.dispose());
    if (!geometry) continue; // 합칠 수 없으면 원래대로 둔다
    // 소품 원본과 같이 쓰는 재질은 복사해서: 맵을 치울 때 원본이 지워지지 않게
    const shared = meshes.some((m) => m.userData.shared);
    const merged = new THREE.Mesh(geometry, shared ? material.clone() : material);
    merged.castShadow = meshes[0].castShadow;
    merged.receiveShadow = meshes[0].receiveShadow;
    for (const m of meshes) m.removeFromParent();
    parent.add(merged);
  }
}

/**
 * 실수(Float32) 속성으로 푼다. 용량을 줄인 모델은 좌표가 정수(-1~1로 압축)라서,
 * 그대로 위치를 옮기면 범위를 넘는 값이 잘려 커다란 상자 모양이 된다.
 */
function toFloat(a: THREE.BufferAttribute): THREE.BufferAttribute {
  const data = new Float32Array(a.count * a.itemSize);
  for (let i = 0; i < a.count; i++) for (let k = 0; k < a.itemSize; k++) data[i * a.itemSize + k] = a.getComponent(i, k);
  return new THREE.BufferAttribute(data, a.itemSize);
}

/** 똑같이 보이는 재질이면 같은 글자. keep 재질은 자기 자신하고만 */
function materialKey(m: THREE.Material, keep: ReadonlySet<THREE.Material> | undefined): string {
  if (keep?.has(m)) return m.uuid;
  const x = m as THREE.MeshLambertMaterial;
  return [m.type, x.color?.getHexString(), x.emissive?.getHexString(), x.map?.uuid ?? '', m.transparent, m.opacity, m.side, m.depthWrite].join(',');
}
