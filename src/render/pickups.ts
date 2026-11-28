import * as THREE from 'three';
import { disposeObject } from './models';

/**
 * 판 보너스 물건: 둥실 떠서 도는 보석 + 바닥의 빛나는 고리.
 * 빨간 예고 칸과 헷갈리지 않게 물건 색의 고리를 쓴다 (예고는 바닥 전체가 빨갛게 차오름).
 */
export interface PickupModel {
  group: THREE.Group;
  gem: THREE.Mesh;
  ring: THREE.Mesh;
}

export function makePickup(color: string): PickupModel {
  const group = new THREE.Group();
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: 0.35 }));
  gem.position.y = 0.5;
  gem.scale.set(1, 1.35, 1);
  gem.castShadow = true;
  group.add(gem);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.26, 0.38, 24),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, depthWrite: false }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  group.add(ring);
  return { group, gem, ring };
}

/** 매 프레임: 둥실둥실, 빙글빙글, 고리가 숨쉬듯 (t는 ms, appear는 0→1 등장) */
export function animatePickup(m: PickupModel, nowMs: number, appear: number, phase: number): void {
  const s = Math.min(1, appear);
  m.group.scale.setScalar(0.001 + s * (1 + (1 - s) * 0.4));
  m.gem.position.y = 0.5 + Math.sin(nowMs / 300 + phase) * 0.07;
  m.gem.rotation.y = nowMs / 500 + phase;
  const pulse = 1 + Math.sin(nowMs / 250 + phase) * 0.08;
  m.ring.scale.set(pulse, pulse, pulse);
}

export function disposePickup(scene: THREE.Scene, m: PickupModel): void {
  scene.remove(m.group);
  disposeObject(m.group);
}
