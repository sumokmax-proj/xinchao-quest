import * as THREE from 'three';
import { mat } from './scene';

/** 임시 도형 모델. 2단계에서 glTF(KayKit 등)로 바꾼다. */
export interface HeroModel {
  group: THREE.Group;
  pivot: THREE.Group; // 검 회전축
  arc: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>; // 베기 궤적
}

export function makeHero(): HeroModel {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.24, 4, 10), mat('#3b6fd8'));
  body.position.y = 0.42;
  g.add(body);
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.215, 0.215, 0.06, 10), mat('#5b3a22'));
  belt.position.y = 0.36;
  g.add(belt);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 14, 10), mat('#f2c9a0'));
  head.position.y = 0.9;
  g.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.265, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), mat('#4a2c1a'));
  hair.position.set(0, 0.93, -0.02);
  hair.rotation.x = -0.35;
  g.add(hair);
  const eyeM = mat('#1c1c1c');
  for (const x of [-0.085, 0.085]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), eyeM);
    e.position.set(x, 0.9, 0.225);
    g.add(e);
  }
  const cape = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.42, 0.04), mat('#c0392b'));
  cape.position.set(0, 0.5, -0.2);
  cape.rotation.x = 0.18;
  g.add(cape);

  const pivot = new THREE.Group();
  pivot.position.set(0.27, 0.48, 0.06);
  g.add(pivot);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.05), mat('#5b3a22'));
  handle.position.y = 0.02;
  pivot.add(handle);
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.06), mat('#e0b040'));
  guard.position.y = 0.1;
  pivot.add(guard);
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.55, 0.025), new THREE.MeshLambertMaterial({ color: '#e8eef2', emissive: '#334455' }));
  blade.position.y = 0.4;
  pivot.add(blade);
  pivot.rotation.x = 0.55;

  const arc = new THREE.Mesh(
    new THREE.RingGeometry(0.45, 0.78, 18, 1, Math.PI * 0.1, Math.PI * 0.8),
    new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }),
  );
  // +90°로 눕혀야 궤적이 캐릭터 앞(공격 방향)에 생긴다. -90°면 등 뒤에 생김 (프로토타입에서 넘어온 버그)
  arc.rotation.x = Math.PI / 2;
  arc.position.y = 0.5;
  g.add(arc);
  g.traverse((o) => {
    if ((o as THREE.Mesh).isMesh && o !== arc) o.castShadow = true;
  });
  return { group: g, pivot, arc };
}

export interface GoblinModel {
  group: THREE.Group;
  club: THREE.Group;
  stars: THREE.Group; // 빈사 때 머리 위에서 도는 별
  mats: THREE.MeshLambertMaterial[]; // 맞았을 때 하얗게 번쩍일 재질
}

export function makeGoblin(boss: boolean): GoblinModel {
  const g = new THREE.Group();
  const skin = new THREE.MeshLambertMaterial({ color: boss ? '#4f8a2e' : '#6aa83e', emissive: '#000000' });
  const cloth = new THREE.MeshLambertMaterial({ color: boss ? '#6b2f2f' : '#8a6a3a', emissive: '#000000' });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.19, 0.16, 4, 10), cloth);
  body.position.y = 0.36;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 14, 10), skin);
  head.position.y = 0.78;
  head.scale.set(1.05, 0.92, 1);
  g.add(head);
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.32, 6), skin);
    ear.position.set(s * 0.3, 0.84, 0);
    ear.rotation.z = -s * 1.25;
    g.add(ear);
  }
  const eyeW = mat('#ffe06b');
  const eyeB = mat('#1a1a1a');
  for (const x of [-0.1, 0.1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), eyeW);
    e.position.set(x, 0.82, 0.22);
    g.add(e);
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.028, 6, 5), eyeB);
    p.position.set(x, 0.82, 0.27);
    g.add(p);
  }
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.14, 5), skin);
  nose.position.set(0, 0.74, 0.27);
  nose.rotation.x = Math.PI / 2;
  g.add(nose);
  const club = new THREE.Group();
  club.position.set(0.26, 0.4, 0.05);
  g.add(club);
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.07, 0.5, 6), mat('#7a4e2d'));
  stick.position.y = 0.2;
  club.add(stick);
  club.rotation.x = 0.5;
  if (boss) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.045, 6, 14), mat('#d63b2b'));
    band.position.y = 0.93;
    band.rotation.x = Math.PI / 2;
    g.add(band);
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 6), mat('#e8dcc0'));
    horn.position.set(0, 1.1, 0);
    g.add(horn);
  }
  const stars = new THREE.Group();
  stars.position.y = 1.18;
  stars.visible = false;
  g.add(stars);
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.07, 0), new THREE.MeshBasicMaterial({ color: '#ffd84a' }));
    const a = (i / 3) * Math.PI * 2;
    s.position.set(Math.cos(a) * 0.25, 0, Math.sin(a) * 0.25);
    stars.add(s);
  }
  g.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.castShadow = true;
  });
  return { group: g, club, stars, mats: [skin, cloth] };
}

/** 고블린 모델이 쓰던 GPU 메모리 정리 (웨이브가 끝날 때마다 새로 만들기 때문) */
export function disposeObject(obj: THREE.Object3D): void {
  obj.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry.dispose();
    const m = mesh.material;
    (Array.isArray(m) ? m : [m]).forEach((x) => x.dispose());
  });
}
