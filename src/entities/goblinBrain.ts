import { CONFIG, type EnemyKind } from '../config';
import { rand, shuffle, type Rng } from '../core/random';
import { DIRS, manhattan, type Cell, type Step } from '../world/Grid';

/**
 * 고블린이 다음에 어디로 걸을지 고른다 (프로토타입과 같은 규칙).
 * - 7칸 안이면 플레이어 쪽으로: 더 멀리 떨어진 축(가로/세로)을 먼저 시도, 막혔으면 다른 축
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
  } else {
    options = shuffle(rng, Object.values(DIRS));
    cooldown = wanderDelay + rand(rng, 0, ai.wanderJitter);
  }
  const step = options.find((o) => isFree(me.c + o.dc, me.r + o.dr)) ?? null;
  return { step, cooldown };
}

/** 바로 옆(상하좌우 1칸)에 플레이어가 있으면 공격 예고를 시작할 수 있다 */
export const isAdjacent = (a: Cell, b: Cell): boolean => manhattan(a, b) === 1;
