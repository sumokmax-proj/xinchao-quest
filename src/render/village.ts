import * as THREE from 'three';
import type { Building, VillageData } from '../core/Village';
import type { Grid } from '../world/Grid';
import { mat } from './scene';

/**
 * 마을 건물과 NPC 모델 (임시 도형). 복구 전 건물은 무너진 잔해로 그린다.
 * 건물은 맵에서 같은 글자가 차지한 칸들의 가운데에 놓는다.
 */

const box = (w: number, h: number, d: number, color: string): THREE.Mesh => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
};

/** 박공지붕 (삼각 기둥) */
function roof(w: number, d: number, h: number, color: string): THREE.Mesh {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, 0);
  shape.lineTo(w / 2, 0);
  shape.lineTo(0, h);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false });
  geo.translate(0, 0, -d / 2);
  const m = new THREE.Mesh(geo, mat(color));
  m.castShadow = true;
  return m;
}

function house(w: number, d: number, wall: string, roofColor: string, h = 1.1): THREE.Group {
  const g = new THREE.Group();
  const body = box(w, h, d, wall);
  body.position.y = h / 2;
  g.add(body);
  const r = roof(w + 0.25, d + 0.2, 0.75, roofColor);
  r.rotation.y = Math.PI / 2;
  r.position.y = h;
  g.add(r);
  const door = box(0.36, 0.6, 0.05, '#5a3a24');
  door.position.set(0, 0.3, d / 2 + 0.03);
  g.add(door);
  return g;
}

function ruin(w: number, d: number): THREE.Group {
  const g = new THREE.Group();
  const rng = (i: number) => (Math.sin(i * 91.7 + w * 13.1 + d * 7.3) + 1) / 2;
  for (let i = 0; i < 4; i++) {
    const h = 0.25 + rng(i) * 0.45;
    const wall = box(w / 2.2, h, 0.16, '#a8957a');
    wall.position.set((i % 2 ? 1 : -1) * w * 0.24, h / 2, (i < 2 ? 1 : -1) * d * 0.38);
    wall.rotation.y = (rng(i + 7) - 0.5) * 0.4;
    g.add(wall);
  }
  for (let i = 0; i < 6; i++) {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.14 + rng(i + 3) * 0.12, 0), mat('#8d918c'));
    rock.position.set((rng(i + 11) - 0.5) * w * 0.8, 0.1, (rng(i + 17) - 0.5) * d * 0.7);
    rock.castShadow = true;
    g.add(rock);
  }
  const plank = box(w * 0.6, 0.06, 0.16, '#7a5232');
  plank.position.set(0, 0.2, 0);
  plank.rotation.z = 0.35;
  g.add(plank);
  return g;
}

function castle(w: number, d: number): THREE.Group {
  const g = new THREE.Group();
  const wall = box(w - 0.4, 1.3, d * 0.7, '#c8b898');
  wall.position.y = 0.65;
  g.add(wall);
  for (let i = 0; i < 6; i++) {
    const cren = box(0.3, 0.25, 0.3, '#c8b898');
    cren.position.set(-w / 2 + 0.6 + i * ((w - 1.2) / 5), 1.42, d * 0.3);
    g.add(cren);
  }
  for (const s of [-1, 1]) {
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.55, 2, 8), mat('#b8a888'));
    tower.position.set(s * (w / 2 - 0.4), 1, 0);
    tower.castShadow = true;
    g.add(tower);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.8, 8), mat('#c63a3a'));
    cap.position.set(s * (w / 2 - 0.4), 2.4, 0);
    cap.castShadow = true;
    g.add(cap);
    const flag = box(0.04, 0.5, 0.04, '#5a3a24');
    flag.position.set(s * (w / 2 - 0.4), 3, 0);
    g.add(flag);
    const cloth = box(0.32, 0.2, 0.02, '#f2c84b');
    cloth.position.set(s * (w / 2 - 0.4) + 0.17, 3.12, 0);
    g.add(cloth);
  }
  const gate = box(1, 0.9, 0.1, '#5a3a24');
  gate.position.set(0, 0.45, d * 0.36);
  g.add(gate);
  return g;
}

function buildingModel(b: Building, w: number, d: number, built: boolean): THREE.Group {
  if (!built) return ruin(w, d);
  switch (b.id) {
    case 'castle':
      return castle(w, d);
    case 'bakery': {
      const g = house(w - 0.2, d - 0.3, '#f0d8a8', '#d6453a');
      const sign = box(0.9, 0.3, 0.06, '#e8b46a');
      sign.position.set(0, 1.25, (d - 0.3) / 2 + 0.06);
      g.add(sign);
      const bread = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.3, 3, 6), mat('#c88a3a'));
      bread.rotation.z = Math.PI / 2;
      bread.position.set(0, 1.25, (d - 0.3) / 2 + 0.12);
      g.add(bread);
      return g;
    }
    case 'smith': {
      const g = house(w - 0.2, d - 0.3, '#8a7a6a', '#4a4a55');
      const chim = box(0.25, 0.8, 0.25, '#6a5a50');
      chim.position.set(0.4, 1.7, -0.1);
      g.add(chim);
      const anvil = box(0.4, 0.25, 0.22, '#3a3a40');
      anvil.position.set(-0.75, 0.13, (d - 0.3) / 2 + 0.2);
      g.add(anvil);
      return g;
    }
    case 'school': {
      const g = house(w - 0.2, d - 0.3, '#e8dcc0', '#3a6a5a', 1.0);
      // 처마 끝이 살짝 올라간 지붕 장식
      for (const s of [-1, 1]) {
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.3, 4), mat('#3a6a5a'));
        tip.position.set(s * (w / 2), 1.1, (d - 0.3) / 2 + 0.1);
        tip.rotation.z = -s * 0.8;
        g.add(tip);
      }
      return g;
    }
    case 'cafe': {
      const g = house(w - 0.2, d - 0.3, '#f2e0c8', '#7a4a2a');
      for (let i = 0; i < 4; i++) {
        const stripe = box((w - 0.2) / 4, 0.05, 0.5, i % 2 ? '#fff4e0' : '#c63a3a');
        stripe.position.set(-((w - 0.2) / 2) + ((w - 0.2) / 8) * (2 * i + 1), 0.95, (d - 0.3) / 2 + 0.25);
        stripe.rotation.x = 0.3;
        g.add(stripe);
      }
      const stool = box(0.22, 0.22, 0.22, '#3a8fd6');
      stool.position.set(-0.6, 0.11, (d - 0.3) / 2 + 0.5);
      g.add(stool);
      return g;
    }
    case 'fountain': {
      const g = new THREE.Group();
      const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.3, 10), mat('#b8b4ac'));
      basin.position.y = 0.15;
      basin.castShadow = true;
      g.add(basin);
      const water = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.05, 10), mat('#5ab0d8'));
      water.position.y = 0.3;
      g.add(water);
      const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.5, 6), mat('#b8b4ac'));
      spout.position.y = 0.5;
      g.add(spout);
      return g;
    }
    default:
      return new THREE.Group();
  }
}

/** 성문 (맵 아래쪽 G 칸들) */
function gate(w: number): THREE.Group {
  const g = new THREE.Group();
  for (const s of [-1, 1]) {
    const post = box(0.3, 1.6, 0.3, '#7a5232');
    post.position.set(s * (w / 2 - 0.15), 0.8, 0);
    g.add(post);
  }
  const top = box(w, 0.25, 0.35, '#5a3a24');
  top.position.y = 1.65;
  g.add(top);
  const sign = box(1.2, 0.3, 0.05, '#e8b46a');
  sign.position.set(0, 1.3, 0.2);
  g.add(sign);
  return g;
}

/** 마을 축제 등불: 두 줄로 걸린 색 등 */
function lanterns(grid: Grid, rows: number[]): THREE.Group {
  const g = new THREE.Group();
  const colors = ['#e8463a', '#f2c84b', '#e87a2a'];
  rows.forEach((r) => {
    for (let c = 1; c < grid.width - 1; c++) {
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), new THREE.MeshBasicMaterial({ color: colors[c % 3] }));
      l.position.set(grid.worldX(c), 1.7 + Math.sin(c) * 0.05, grid.worldZ(r));
      l.scale.y = 1.3;
      g.add(l);
    }
  });
  return g;
}

/** 마을 건물 전부. built: 복구된 건물 id */
export function buildVillageProps(grid: Grid, v: VillageData, built: ReadonlySet<string>): THREE.Group {
  const root = new THREE.Group();
  for (const b of v.buildings) {
    if (!b.tile) continue;
    let minC = Infinity, maxC = -Infinity, minR = Infinity, maxR = -Infinity;
    v.rows.forEach((row, r) =>
      [...row].forEach((ch, c) => {
        if (ch !== b.tile) return;
        minC = Math.min(minC, c);
        maxC = Math.max(maxC, c);
        minR = Math.min(minR, r);
        maxR = Math.max(maxR, r);
      }),
    );
    if (minC === Infinity) continue;
    const w = maxC - minC + 1;
    const d = maxR - minR + 1;
    const m = buildingModel(b, w, d, built.has(b.id));
    m.position.set((grid.worldX(minC) + grid.worldX(maxC)) / 2, 0, (grid.worldZ(minR) + grid.worldZ(maxR)) / 2);
    root.add(m);
  }
  const gates: number[] = [];
  v.rows.forEach((row, r) => [...row].forEach((ch, c) => ch === 'G' && gates.push(c + r * 1000)));
  if (gates.length) {
    const cs = gates.map((x) => x % 1000);
    const r = Math.floor(gates[0] / 1000);
    const gm = gate(Math.max(...cs) - Math.min(...cs) + 1);
    gm.position.set((grid.worldX(Math.min(...cs)) + grid.worldX(Math.max(...cs))) / 2, 0, grid.worldZ(r));
    root.add(gm);
  }
  if (built.has('festival')) root.add(lanterns(grid, [4, 9]));
  return root;
}

/* ---------- NPC ---------- */

const LOOKS: Record<string, { body: string; hat: string | null; skin?: string; scale?: number }> = {
  lord: { body: '#7a2f3a', hat: '#e8b46a', scale: 1.1 },
  baker: { body: '#f2f0e8', hat: '#ffffff' },
  smith: { body: '#5a4a3a', hat: null },
  teacher: { body: '#3a6a5a', hat: '#2a2a2a' },
  barista: { body: '#7a4a2a', hat: null },
  guard: { body: '#8a8f98', hat: '#6a6f78' },
  kid: { body: '#e8b43a', hat: null, scale: 0.75 },
};

export interface NpcModel {
  group: THREE.Group;
}

export function makeNpc(look: string): NpcModel {
  const L = LOOKS[look] ?? LOOKS.kid;
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.2, 4, 8), mat(L.body));
  body.position.y = 0.38;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 9), mat(L.skin ?? '#f2d2b0'));
  head.position.y = 0.82;
  g.add(head);
  for (const x of [-0.09, 0.09]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), mat('#1a1a1a'));
    e.position.set(x, 0.84, 0.22);
    g.add(e);
  }
  if (look === 'lord') {
    // 반미 모양 왕관
    const crown = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.34, 4, 8), mat(L.hat!));
    crown.rotation.z = Math.PI / 2;
    crown.position.y = 1.1;
    g.add(crown);
    const stache = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.04), mat('#5a3a24'));
    stache.position.set(0, 0.74, 0.24);
    g.add(stache);
  } else if (look === 'teacher') {
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.12, 10), mat(L.hat!));
    hat.position.y = 1.07;
    g.add(hat);
    const beard = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.22, 6), mat('#e8e8e8'));
    beard.position.set(0, 0.66, 0.2);
    beard.rotation.x = Math.PI;
    g.add(beard);
  } else if (look === 'baker') {
    // 논라(nón lá) 삿갓
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.24, 12), mat('#e8d49a'));
    hat.position.y = 1.08;
    g.add(hat);
  } else if (L.hat) {
    const hat = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(L.hat));
    hat.position.y = 0.88;
    g.add(hat);
  }
  if (look === 'smith') {
    const hammer = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.1), mat('#3a3a40'));
    hammer.position.set(0.28, 0.5, 0.1);
    g.add(hammer);
  }
  g.scale.setScalar(L.scale ?? 1);
  g.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.castShadow = true;
  });
  return { group: g };
}
