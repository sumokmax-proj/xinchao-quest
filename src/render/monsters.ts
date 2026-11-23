import * as THREE from 'three';
import type { EnemyKind } from '../config';
import { mat } from './scene';
import { makeGoblin, type GoblinModel } from './models';

/**
 * 스테이지마다 다른 몬스터 모델 (임시 도형. M3에서 로폴리 에셋으로 바꿀 예정).
 * 모두 GoblinModel 모양을 따른다: club은 공격할 때 휘두르는 부분, stars는 빈사 별, mats는 맞으면 번쩍일 재질.
 */

/** 처치 때 튀는 조각 색 */
export const MONSTER_COLOR: Record<EnemyKind, string> = {
  goblin: '#6aa83e',
  boss: '#d63b2b',
  monkey: '#a8734a',
  buffalo: '#5a5a66',
  dog: '#c9a46a',
  frog: '#5fbf4a',
  king: '#f2c84b',
};

const flashMat = (color: string) => new THREE.MeshLambertMaterial({ color, emissive: '#000000' });

function addStars(g: THREE.Group, y: number): THREE.Group {
  const stars = new THREE.Group();
  stars.position.y = y;
  stars.visible = false;
  g.add(stars);
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.07, 0), new THREE.MeshBasicMaterial({ color: '#ffd84a' }));
    const a = (i / 3) * Math.PI * 2;
    s.position.set(Math.cos(a) * 0.25, 0, Math.sin(a) * 0.25);
    stars.add(s);
  }
  return stars;
}

function eyes(g: THREE.Group, y: number, z: number, gap: number, size = 0.05, white = '#ffffff'): void {
  for (const x of [-gap, gap]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(size, 8, 6), mat(white));
    e.position.set(x, y, z);
    g.add(e);
    const p = new THREE.Mesh(new THREE.SphereGeometry(size * 0.55, 6, 5), mat('#1a1a1a'));
    p.position.set(x, y, z + size * 0.7);
    g.add(p);
  }
}

function finish(g: THREE.Group, club: THREE.Group, starsY: number, mats: THREE.MeshLambertMaterial[]): GoblinModel {
  const stars = addStars(g, starsY);
  g.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.castShadow = true;
  });
  return { group: g, club, stars, mats };
}

/** 원숭이: 갈색 털, 연한 얼굴, 긴 꼬리. 팔(club)로 할퀸다 */
function makeMonkey(): GoblinModel {
  const g = new THREE.Group();
  const fur = flashMat('#8a5a36');
  const face = flashMat('#e8c49a');
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.14, 4, 8), fur);
  body.position.y = 0.33;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 9), fur);
  head.position.y = 0.72;
  g.add(head);
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), face);
  muzzle.position.set(0, 0.68, 0.14);
  muzzle.scale.set(1.1, 0.85, 0.7);
  g.add(muzzle);
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), face);
    ear.position.set(s * 0.25, 0.76, 0);
    ear.scale.z = 0.5;
    g.add(ear);
  }
  eyes(g, 0.77, 0.2, 0.08, 0.045);
  const tail = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.035, 5, 12, Math.PI * 1.3), fur);
  tail.position.set(0, 0.35, -0.25);
  tail.rotation.y = Math.PI / 2;
  g.add(tail);
  const club = new THREE.Group();
  club.position.set(0.2, 0.42, 0.05);
  g.add(club);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.36, 6), fur);
  arm.position.y = 0.16;
  club.add(arm);
  return finish(g, club, 1.08, [fur, face]);
}

/** 물소: 검회색 몸통, 휘어진 큰 뿔. 머리(club)로 들이받는다 */
function makeBuffalo(): GoblinModel {
  const g = new THREE.Group();
  const hide = flashMat('#4a4a55');
  const horn = flashMat('#e6dcc4');
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.42, 0.78), hide);
  body.position.y = 0.42;
  g.add(body);
  for (const [x, z] of [[-0.22, -0.28], [0.22, -0.28], [-0.22, 0.26], [0.22, 0.26]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.26, 6), hide);
    leg.position.set(x, 0.13, z);
    g.add(leg);
  }
  const club = new THREE.Group(); // 머리
  club.position.set(0, 0.5, 0.42);
  g.add(club);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.32, 0.3), hide);
  head.position.set(0, 0, 0.1);
  club.add(head);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.16, 0.08), flashMat('#6a6a72'));
  nose.position.set(0, -0.07, 0.27);
  club.add(nose);
  for (const s of [-1, 1]) {
    const h = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.04, 5, 10, Math.PI * 0.75), horn);
    h.position.set(s * 0.2, 0.14, 0.05);
    h.rotation.set(0, s > 0 ? 0 : Math.PI, -0.3);
    club.add(h);
  }
  const eyesG = new THREE.Group();
  eyes(eyesG, 0.05, 0.26, 0.11, 0.04);
  club.add(eyesG);
  club.rotation.x = 0;
  return finish(g, club, 1.1, [hide, horn]);
}

/** 들개: 누런 털, 뾰족한 귀, 긴 주둥이(club) */
function makeDog(): GoblinModel {
  const g = new THREE.Group();
  const fur = flashMat('#b8925a');
  const dark = flashMat('#6a4a2a');
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.3, 4, 8), fur);
  body.rotation.x = Math.PI / 2;
  body.position.y = 0.36;
  g.add(body);
  for (const [x, z] of [[-0.12, -0.2], [0.12, -0.2], [-0.12, 0.2], [0.12, 0.2]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.24, 5), fur);
    leg.position.set(x, 0.12, z);
    g.add(leg);
  }
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.3, 5), dark);
  tail.position.set(0, 0.5, -0.36);
  tail.rotation.x = -0.9;
  g.add(tail);
  const club = new THREE.Group(); // 머리
  club.position.set(0, 0.55, 0.3);
  g.add(club);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), fur);
  club.add(head);
  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.11, 0.2), fur);
  snout.position.set(0, -0.04, 0.17);
  club.add(snout);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), mat('#1a1a1a'));
  nose.position.set(0, -0.01, 0.28);
  club.add(nose);
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 4), dark);
    ear.position.set(s * 0.1, 0.17, -0.02);
    club.add(ear);
  }
  const eg = new THREE.Group();
  eyes(eg, 0.05, 0.13, 0.07, 0.035, '#ffe06b');
  club.add(eg);
  return finish(g, club, 1.0, [fur, dark]);
}

/** 개구리: 초록 몸, 툭 튀어나온 눈, 볼주머니(club)로 물총 */
function makeFrog(): GoblinModel {
  const g = new THREE.Group();
  const skin = flashMat('#4fae3e');
  const belly = flashMat('#d8e89a');
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 9), skin);
  body.position.y = 0.28;
  body.scale.set(1.1, 0.75, 1);
  g.add(body);
  const bel = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), belly);
  bel.position.set(0, 0.24, 0.12);
  bel.scale.set(1, 0.7, 0.8);
  g.add(bel);
  for (const s of [-1, 1]) {
    const bump = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), skin);
    bump.position.set(s * 0.14, 0.5, 0.08);
    g.add(bump);
    const leg = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), skin);
    leg.position.set(s * 0.27, 0.1, -0.08);
    leg.scale.set(0.8, 0.6, 1.4);
    g.add(leg);
  }
  eyes(g, 0.55, 0.15, 0.14, 0.06, '#fff4b0');
  const club = new THREE.Group(); // 입 (물총)
  club.position.set(0, 0.32, 0.27);
  g.add(club);
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.025, 5, 10), mat('#c0483a'));
  club.add(mouth);
  return finish(g, club, 0.9, [skin, belly]);
}

/** 고블린 왕: 대장 고블린에 금관과 망토 */
function makeKing(): GoblinModel {
  const m = makeGoblin(true);
  const gold = mat('#f2c84b');
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.14, 8, 1, true), gold);
  crown.position.y = 1.08;
  m.group.add(crown);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 4), gold);
    spike.position.set(Math.cos(a) * 0.2, 1.2, Math.sin(a) * 0.2);
    m.group.add(spike);
  }
  const cape = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.55, 8, 1, true), mat('#7a1f2a'));
  cape.position.set(0, 0.36, -0.06);
  m.group.add(cape);
  m.stars.position.y = 1.4;
  return m;
}

export function makeMonster(kind: EnemyKind): GoblinModel {
  switch (kind) {
    case 'monkey':
      return makeMonkey();
    case 'buffalo':
      return makeBuffalo();
    case 'dog':
      return makeDog();
    case 'frog':
      return makeFrog();
    case 'king':
      return makeKing();
    default:
      return makeGoblin(kind === 'boss');
  }
}
