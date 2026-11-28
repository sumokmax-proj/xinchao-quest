import * as THREE from 'three';
import type { EnemyKind } from '../config';
import { mat } from './scene';
import { makeGoblin, type GoblinModel } from './models';
import { mergeByMaterial } from './merge';

/**
 * 스테이지마다 다른 몬스터 모델. 맞는 CC0 에셋이 없어 도형을 조합해 만든다.
 * 모두 GoblinModel 모양을 따른다: club은 공격할 때 휘두르는 부분, stars는 빈사 별, mats는 맞으면 번쩍일 재질.
 */

/** 처치 때 튀는 조각 색 */
export const MONSTER_COLOR: Record<EnemyKind, string> = {
  goblin: '#6aa83e',
  boss: '#d63b2b',
  monkey: '#9a5f33',
  buffalo: '#5a5e74',
  dog: '#e09a3e',
  frog: '#8fd62f',
  king: '#f2c84b',
  golden: '#ffd84a',
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

/** 모양 조각 하나를 만들어 붙인다 */
function part(
  parent: THREE.Object3D,
  geo: THREE.BufferGeometry,
  m: THREE.Material,
  pos: [number, number, number],
  scale: [number, number, number] = [1, 1, 1],
  rot: [number, number, number] = [0, 0, 0],
): THREE.Mesh {
  const mesh = new THREE.Mesh(geo, m);
  mesh.position.set(...pos);
  mesh.scale.set(...scale);
  mesh.rotation.set(...rot);
  parent.add(mesh);
  return mesh;
}

const ball = (r: number) => new THREE.SphereGeometry(r, 12, 9);
const cyl = (top: number, bottom: number, h: number, seg = 6) => new THREE.CylinderGeometry(top, bottom, h, seg);
const cone = (r: number, h: number, seg = 6) => new THREE.ConeGeometry(r, h, seg);
const tube = (points: [number, number, number][], r: number) =>
  new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))), 18, r, 6);

/*
 * 카메라가 위에서 내려다보므로 "위에서 본 윤곽"이 종류마다 달라야 한다.
 * 원숭이 = 옆으로 크게 휘어 올라간 긴 꼬리와 큰 귀 / 물소 = 몸보다 넓은 흰 뿔 / 들개 = 흰 끝의 말린 꼬리와 흰 주둥이
 * 개구리 = 납작하고 옆으로 벌린 뒷다리 + 머리 위 큰 눈 / 고블린 왕 = 넓은 금관과 펼친 보라 망토
 */

/** 원숭이: 갈색 털, 연한 얼굴, 크고 둥근 귀, 옆으로 말려 올라가는 긴 꼬리. 긴 팔(club)로 할퀸다 */
function makeMonkey(): GoblinModel {
  const g = new THREE.Group();
  const fur = flashMat('#9a5f33');
  const face = flashMat('#f0cfa4');
  part(g, new THREE.CapsuleGeometry(0.16, 0.14, 4, 8), fur, [0, 0.32, 0]);
  part(g, ball(0.22), fur, [0, 0.68, 0.02]);
  part(g, ball(0.15), face, [0, 0.65, 0.15], [1.1, 0.9, 0.7]);
  for (const x of [-1, 1]) {
    part(g, ball(0.13), fur, [x * 0.29, 0.74, 0], [1, 1, 0.45]);
    part(g, ball(0.085), face, [x * 0.29, 0.74, 0.045], [1, 1, 0.4]);
    part(g, cyl(0.05, 0.045, 0.2), fur, [x * 0.1, 0.1, 0.02]);
  }
  eyes(g, 0.74, 0.22, 0.075, 0.042);
  part(g, tube([[0, 0.22, -0.14], [0.14, 0.18, -0.4], [0.44, 0.35, -0.36], [0.46, 0.68, -0.18], [0.3, 0.76, -0.24], [0.34, 0.62, -0.3]], 0.045), fur, [0, 0, 0]);
  const club = new THREE.Group();
  club.position.set(0.2, 0.42, 0.05);
  g.add(club);
  part(club, cyl(0.05, 0.04, 0.4), fur, [0.02, 0.18, 0]);
  part(club, ball(0.07), face, [0.02, 0.4, 0]);
  part(g, cyl(0.05, 0.04, 0.34), fur, [-0.24, 0.3, 0.06], [1, 1, 1], [0.2, 0, -0.5]);
  return finish(g, club, 1.1, [fur, face]);
}

/** 물소: 둥글고 큰 검푸른 몸, 어깨 혹, 몸보다 넓게 휘어진 흰 뿔. 머리(club)로 들이받는다 */
function makeBuffalo(): GoblinModel {
  const g = new THREE.Group();
  const hide = flashMat('#474a5c');
  const horn = flashMat('#f4ecd2');
  const snout = flashMat('#8b8794');
  part(g, ball(0.34), hide, [0, 0.44, -0.08], [1, 0.8, 1.25]);
  part(g, ball(0.24), hide, [0, 0.6, 0.12], [1.15, 0.85, 0.9]); // 어깨 혹
  for (const [x, z] of [[-0.2, -0.32], [0.2, -0.32], [-0.2, 0.18], [0.2, 0.18]] as const) part(g, cyl(0.08, 0.065, 0.28), hide, [x, 0.14, z]);
  part(g, tube([[0, 0.55, -0.46], [0, 0.46, -0.58], [0.06, 0.24, -0.6]], 0.025), hide, [0, 0, 0]);
  part(g, ball(0.06), mat('#1d1d24'), [0.07, 0.2, -0.6]);
  const club = new THREE.Group(); // 머리
  club.position.set(0, 0.52, 0.4);
  g.add(club);
  part(club, ball(0.2), hide, [0, 0, 0.06], [1, 0.9, 0.95]);
  part(club, ball(0.13), snout, [0, -0.08, 0.2], [1.25, 0.75, 0.8]);
  for (const x of [-1, 1]) {
    // 뿌리는 굵고 끝은 위로 휘어 올라가는 뿔
    part(club, tube([[x * 0.12, 0.12, 0.04], [x * 0.34, 0.12, 0.02], [x * 0.5, 0.2, 0.08], [x * 0.52, 0.34, 0.16]], 0.055), horn, [0, 0, 0]);
    part(club, cone(0.055, 0.14), horn, [x * 0.52, 0.4, 0.18], [1, 1, 1], [0.4, 0, 0]);
    part(club, ball(0.035), mat('#1a1a1a'), [x * 0.1, 0.05, 0.23]);
    part(club, ball(0.025), mat('#2a2a30'), [x * 0.055, -0.07, 0.31]);
  }
  return finish(g, club, 1.15, [hide, horn, snout]);
}

/** 들개: 주황빛 털, 검은 등, 흰 주둥이, 뾰족한 큰 귀, 끝이 흰 말린 꼬리. 머리(club)로 문다 */
function makeDog(): GoblinModel {
  const g = new THREE.Group();
  const fur = flashMat('#e09a3e');
  const dark = flashMat('#4a3020');
  const white = flashMat('#fff3da');
  part(g, new THREE.CapsuleGeometry(0.21, 0.34, 4, 10), fur, [0, 0.38, -0.04], [1, 1, 1], [Math.PI / 2, 0, 0]);
  part(g, ball(0.19), dark, [0, 0.52, -0.1], [0.9, 0.45, 1.5]); // 검은 등
  for (const [x, z] of [[-0.15, -0.26], [0.15, -0.26], [-0.15, 0.2], [0.15, 0.2]] as const) {
    part(g, cyl(0.06, 0.05, 0.24), fur, [x, 0.13, z]);
    part(g, ball(0.062), white, [x, 0.04, z + 0.02], [1, 0.6, 1.2]);
  }
  part(g, tube([[0, 0.46, -0.38], [0, 0.66, -0.54], [0, 0.86, -0.44], [0, 0.84, -0.3]], 0.07), fur, [0, 0, 0]);
  part(g, ball(0.09), white, [0, 0.84, -0.28]);
  const club = new THREE.Group(); // 머리
  club.position.set(0, 0.6, 0.32);
  g.add(club);
  part(club, ball(0.2), fur, [0, 0, 0]);
  part(club, new THREE.BoxGeometry(0.17, 0.12, 0.22), white, [0, -0.06, 0.2]);
  part(club, ball(0.05), mat('#1a1a1a'), [0, -0.01, 0.32]);
  for (const x of [-1, 1]) {
    part(club, cone(0.12, 0.3, 4), dark, [x * 0.2, 0.2, -0.02], [1, 1, 0.7], [0, 0, -x * 0.55]);
    part(club, cone(0.022, 0.08, 4), white, [x * 0.05, -0.14, 0.27], [1, 1, 1], [Math.PI, 0, 0]); // 송곳니
  }
  const eg = new THREE.Group();
  eyes(eg, 0.06, 0.16, 0.08, 0.04, '#ffe06b');
  club.add(eg);
  return finish(g, club, 1.15, [fur, dark, white]);
}

/** 개구리: 연두색의 납작한 몸, 머리 위로 튀어나온 큰 눈, 옆으로 벌린 뒷다리와 물갈퀴. 입(club)으로 물총 */
function makeFrog(): GoblinModel {
  const g = new THREE.Group();
  const skin = flashMat('#8fd62f');
  const belly = flashMat('#f3f0a8');
  const spot = flashMat('#3f7a1f');
  part(g, ball(0.3), skin, [0, 0.26, 0], [1.15, 0.7, 1.05]);
  part(g, ball(0.22), belly, [0, 0.2, 0.15], [1.1, 0.65, 0.8]);
  for (const [x, y, z] of [[-0.12, 0.45, -0.1], [0.13, 0.43, -0.16], [0.02, 0.4, -0.24]] as const) part(g, ball(0.06), spot, [x, y, z], [1, 0.4, 1]);
  for (const x of [-1, 1]) {
    // 접힌 뒷다리: 옆으로 크게 벌림 (마름모 윤곽)
    part(g, new THREE.CapsuleGeometry(0.075, 0.26, 4, 8), skin, [x * 0.38, 0.16, -0.12], [1, 1, 1], [Math.PI / 2, 0, x * 0.2]);
    part(g, new THREE.CapsuleGeometry(0.055, 0.2, 4, 8), skin, [x * 0.46, 0.08, 0.02], [1, 1, 1], [Math.PI / 2, x * 0.7, 0]);
    part(g, ball(0.09), spot, [x * 0.54, 0.04, 0.14], [1.2, 0.3, 1]);
    part(g, ball(0.07), spot, [x * 0.22, 0.04, 0.3], [1.2, 0.3, 1]);
    // 큰 눈
    part(g, ball(0.13), skin, [x * 0.17, 0.5, 0.08]);
    part(g, ball(0.095), mat('#fff8c8'), [x * 0.17, 0.56, 0.13]);
    part(g, ball(0.045), mat('#1a1a1a'), [x * 0.17, 0.59, 0.21]);
  }
  const club = new THREE.Group(); // 입 (물총)
  club.position.set(0, 0.3, 0.3);
  g.add(club);
  part(club, new THREE.TorusGeometry(0.07, 0.03, 6, 12), mat('#c0483a'), [0, 0, 0]);
  return finish(g, club, 0.95, [skin, belly, spot]);
}

/** 고블린 왕: 대장 고블린 위에 넓은 금관, 펼친 보라 망토, 금 어깨 장식 (대장의 빨간 띠·뿔은 관에 가려짐) */
function makeKing(): GoblinModel {
  const m = makeGoblin(true);
  const gold = new THREE.MeshLambertMaterial({ color: '#ffd23f', emissive: '#6a4a00' });
  const purple = mat('#6a2c8f');
  const fur = mat('#f4ecd8');
  part(m.group, cyl(0.31, 0.27, 0.13, 10), gold, [0, 1.05, 0]);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    part(m.group, cone(0.07, 0.22, 4), gold, [Math.cos(a) * 0.27, 1.21, Math.sin(a) * 0.27]);
    part(m.group, ball(0.04), mat('#e8324a'), [Math.cos(a) * 0.3, 1.06, Math.sin(a) * 0.3]);
  }
  part(m.group, ball(0.15), purple, [0, 1.12, 0], [1.4, 0.8, 1.4]);
  // 등 뒤로 넓게 펼쳐지는 망토 (위에서도 보라색 부채 모양)
  part(m.group, cone(0.5, 0.68, 10), purple, [0, 0.36, -0.2], [1.15, 1, 0.75], [0.28, 0, 0]);
  part(m.group, new THREE.TorusGeometry(0.25, 0.07, 6, 16), fur, [0, 0.58, -0.02], [1, 1, 1], [Math.PI / 2, 0, 0]);
  for (const x of [-1, 1]) part(m.group, ball(0.13), gold, [x * 0.33, 0.54, 0], [1, 0.7, 1]);
  m.group.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.castShadow = true;
  });
  m.stars.position.y = 1.52;
  return m;
}

/** 로그라이트 3단계: 가끔 나타나 도망 다니는 황금 고블린. 금색 몸에 등에는 돈 자루 */
function makeGolden(): GoblinModel {
  const m = makeGoblin(false, { skin: '#f2c84b', cloth: '#fff1b8' });
  const bag = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), mat('#b5773a'));
  bag.position.set(0, 0.5, -0.24);
  bag.scale.set(1, 1.1, 0.8);
  bag.castShadow = true;
  m.group.add(bag);
  const knot = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.12, 6), mat('#8a5226'));
  knot.position.set(0, 0.7, -0.24);
  m.group.add(knot);
  const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 10), mat('#ffe680'));
  coin.position.set(0.09, 0.56, -0.38);
  coin.rotation.x = Math.PI / 2;
  m.group.add(coin);
  return m;
}

/** 몬스터 한 마리의 조각을 재질별로 합친다. 휘두르는 팔(club)과 빈사 별은 따로 움직이므로 그대로 */
export function makeMonster(kind: EnemyKind): GoblinModel {
  const model = buildMonster(kind);
  const keep = new Set<THREE.Material>(model.mats);
  mergeByMaterial(model.group, { skip: new Set([model.club, model.stars]), keep });
  mergeByMaterial(model.club, { keep });
  mergeByMaterial(model.stars);
  return model;
}

function buildMonster(kind: EnemyKind): GoblinModel {
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
    case 'golden':
      return makeGolden();
    default:
      return makeGoblin(kind === 'boss');
  }
}
