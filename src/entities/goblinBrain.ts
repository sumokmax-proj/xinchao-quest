import { CONFIG, type EnemyKind } from '../config';
import { rand, shuffle, type Rng } from '../core/random';
import { DIRS, manhattan, type Cell, type Step } from '../world/Grid';

/**
 * 고블린이 다음에 어디로 걸을지 고른다 (프로토타입과 같은 규칙).
 * - 7칸 안이면 플레이어 쪽으로: 나무·바위를 돌아가는 가장 짧은 길의 첫 칸.
 *   길이 여러 개면 더 멀리 떨어진 축(가로/세로)을 먼저 쓰는 길. 길이 없으면 그 축 → 다른 축 순서로 시도
 * - 멀면 아무 방향이나 어슬렁
 * 돌려주는 cooldown은 다음 걸음까지 기다릴 시간 (걷지 못했어도 적용).
 */
export function chooseGoblinStep(
  me: Cell,
  player: Cell,
  kind: EnemyKind,
  wanderDelay: number,
  isFree: (c: number, r: number) => boolean,
  rng: Rng,
): { step: Step | null; cooldown: number } {
  const ai = CONFIG.goblinAi;
  const dc = player.c - me.c;
  const dr = player.r - me.r;
  let options: Step[];
  let cooldown: number;
  if (manhattan(me, player) <= ai.chaseRange) {
    const horizontal = { dc: Math.sign(dc), dr: 0 };
    const vertical = { dc: 0, dr: Math.sign(dr) };
    options = (Math.abs(dc) >= Math.abs(dr) ? [horizontal, vertical] : [vertical, horizontal]).filter((o) => o.dc || o.dr);
    cooldown = CONFIG.enemies[kind].chaseStepDelay + rand(rng, 0, ai.chaseStepJitter);
    const path = firstStepToward(me, player, options, ai.pathSearchDepth, isFree);
    if (path) return { step: path, cooldown };
  } else {
    options = shuffle(rng, Object.values(DIRS));
    cooldown = wanderDelay + rand(rng, 0, ai.wanderJitter);
  }
  const step = options.find((o) => isFree(me.c + o.dc, me.r + o.dr)) ?? null;
  return { step, cooldown };
}

/**
 * 플레이어 바로 옆 칸까지 가는 가장 짧은 길을 찾아 첫 걸음을 돌려준다 (너비 우선 탐색, BFS).
 * 가까운 칸부터 한 겹씩 넓혀 가며 찾으므로, 처음 도착한 길이 가장 짧은 길이다.
 * preferred에 있는 방향을 먼저 넣어서, 길이가 같으면 그 방향으로 시작하는 길을 고른다.
 * maxDepth 걸음 안에 길이 없으면 null.
 */
export function firstStepToward(
  me: Cell,
  player: Cell,
  preferred: readonly Step[],
  maxDepth: number,
  isFree: (c: number, r: number) => boolean,
): Step | null {
  const order = [...preferred, ...Object.values(DIRS).filter((d) => !preferred.some((p) => p.dc === d.dc && p.dr === d.dr))];
  const key = (c: number, r: number) => `${c},${r}`;
  const seen = new Set([key(me.c, me.r)]);
  // 큐의 각 칸은 "처음 어느 방향으로 출발해서 왔는지"를 기억한다
  let layer: { c: number; r: number; first: Step }[] = [];
  for (const d of order) {
    const c = me.c + d.dc;
    const r = me.r + d.dr;
    if (!isFree(c, r)) continue;
    if (isAdjacent({ c, r }, player)) return d;
    seen.add(key(c, r));
    layer.push({ c, r, first: d });
  }
  for (let depth = 2; depth <= maxDepth && layer.length > 0; depth++) {
    const next: typeof layer = [];
    for (const cur of layer) {
      for (const d of order) {
        const c = cur.c + d.dc;
        const r = cur.r + d.dr;
        const k = key(c, r);
        if (seen.has(k) || !isFree(c, r)) continue;
        if (isAdjacent({ c, r }, player)) return cur.first;
        seen.add(k);
        next.push({ c, r, first: cur.first });
      }
    }
    layer = next;
  }
  return null;
}

/** 바로 옆(상하좌우 1칸)에 플레이어가 있으면 공격 예고를 시작할 수 있다 */
export const isAdjacent = (a: Cell, b: Cell): boolean => manhattan(a, b) === 1;
