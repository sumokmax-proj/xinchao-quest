import type { Cell } from '../world/Grid';
import { pick, type Rng } from './random';

/**
 * 마을 허브 (순수 로직). 마을은 **도감에 모은 단어 수**만큼 다시 지어진다 (Rumble Heroes의 마을 키우기를 학습으로).
 * 데이터: src/data/village.json
 */
export interface Building {
  id: string;
  tile: string; // 맵에서 이 건물이 차지하는 글자 (없으면 장식만)
  name: string;
  need: number; // 복구에 필요한 도감 단어 수
}

export type NpcRole = 'lord' | 'food' | 'gear' | 'book' | 'question';

export interface Npc {
  id: string;
  name: string;
  at: Cell;
  building: string; // 이 건물이 복구돼야 나타난다
  role: NpcRole;
  look: string;
}

export interface VillageQuestion {
  q: string;
  ko: string;
  right: string;
  rightKo: string;
  wrong: string;
  wrongKo: string;
  status?: string;
}

export interface VillageData {
  name: string;
  theme?: string;
  rows: string[];
  start: Cell;
  spawnArea: { minC: number; maxC: number; minR: number; maxR: number };
  buildings: Building[];
  npcs: Npc[];
  questions: VillageQuestion[];
}

/** 복구된 건물 id들 */
export function builtSet(buildings: readonly Building[], collected: number): Set<string> {
  return new Set(buildings.filter((b) => collected >= b.need).map((b) => b.id));
}

/** 다음에 복구될 건물 (다 지었으면 null) */
export function nextBuilding(buildings: readonly Building[], collected: number): Building | null {
  return buildings.filter((b) => collected < b.need).sort((a, b) => a.need - b.need)[0] ?? null;
}

/** 지금 마을에 나와 있는 NPC */
export function activeNpcs(v: VillageData, collected: number): Npc[] {
  const built = builtSet(v.buildings, collected);
  return v.npcs.filter((n) => built.has(n.building));
}

/** 부딪힌 칸에 무엇이 있나: NPC / 성문 / 건물 / 없음 */
export type Touch = { kind: 'npc'; npc: Npc } | { kind: 'gate' } | { kind: 'building'; building: Building } | { kind: 'none' };

export function touchAt(v: VillageData, npcs: readonly Npc[], c: number, r: number): Touch {
  const npc = npcs.find((n) => n.at.c === c && n.at.r === r);
  if (npc) return { kind: 'npc', npc };
  const ch = v.rows[r]?.[c];
  if (ch === 'G') return { kind: 'gate' };
  const b = v.buildings.find((x) => x.tile && x.tile === ch);
  if (b) return { kind: 'building', building: b };
  return { kind: 'none' };
}

/** 마을 사람 질문: 이번 방문에 아직 안 물은 것 중에서. 다 물었으면 아무거나 */
export function pickVillageQuestion(questions: readonly VillageQuestion[], asked: ReadonlySet<string>, rng: Rng): VillageQuestion {
  const left = questions.filter((q) => !asked.has(q.q));
  return pick(rng, left.length ? left : questions);
}

/** 2지선다 보기 순서: rng < 0.5면 정답이 왼쪽 */
export function questionOptions(q: VillageQuestion, rng: Rng): { options: [string, string]; answer: 0 | 1 } {
  return rng() < 0.5 ? { options: [q.right, q.wrong], answer: 0 } : { options: [q.wrong, q.right], answer: 1 };
}
