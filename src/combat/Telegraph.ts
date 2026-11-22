import type { Cell } from '../world/Grid';

/** 빨간 예고 칸. 시간이 다 되면 그 칸에 플레이어가 아직 있을 때만 맞는다. */
export interface TelegraphState {
  cell: Cell;
  elapsed: number;
  duration: number;
}

/** 0(막 시작) ~ 1(공격 순간) */
export const telegraphProgress = (t: TelegraphState): number => t.elapsed / t.duration;

export const telegraphDone = (t: TelegraphState): boolean => t.elapsed >= t.duration;

/** 예고가 끝난 순간, 플레이어가 그 칸에 남아 있고 살아 있으면 맞는다 */
export const telegraphHits = (t: TelegraphState, player: Cell, playerHp: number): boolean =>
  playerHp > 0 && player.c === t.cell.c && player.r === t.cell.r;
