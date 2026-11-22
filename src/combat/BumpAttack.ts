import { DIRS, type Cell, type Dir, type Grid } from '../world/Grid';

/** 방향 버튼을 눌렀을 때 무슨 일이 일어나는지 */
export type BumpDecision<E> =
  | { kind: 'attack'; target: E } // 고블린이 있는 칸 → 공격
  | { kind: 'wait' } // 고블린이 있지만 공격 쿨다운 중 → 입력을 기억해 두고 기다림
  | { kind: 'ignore' } // 빈사(퀴즈 중) 고블린 → 아무 일도 안 함
  | { kind: 'wall' } // 나무·바위 → 툭 부딪힘
  | { kind: 'still' } // 방금 부딪혀서(쿨다운 중) 또 나무·바위 쪽 → 방향만 바꾸고 소리 없음
  | { kind: 'move'; to: Cell }; // 빈 칸 → 이동

/**
 * 범프 공격 규칙 (이스 방식): 적이 있는 칸으로 가려 하면 그게 공격이다.
 * enemyAt: 그 칸에 서 있는 (살아 있는) 적. 없으면 undefined.
 */
export function decideBump<E extends { dazed: boolean }>(
  from: Cell,
  dir: Dir,
  grid: Grid,
  enemyAt: (c: number, r: number) => E | undefined,
  attackReady: boolean,
): BumpDecision<E> {
  const d = DIRS[dir];
  const to = { c: from.c + d.dc, r: from.r + d.dr };
  const enemy = enemyAt(to.c, to.r);
  if (enemy) {
    if (enemy.dazed) return { kind: 'ignore' };
    if (!attackReady) return { kind: 'wait' };
    return { kind: 'attack', target: enemy };
  }
  // 꾹 누르고 있어도 쿨다운(0.18초)이 끝나야 다시 "툭"
  if (grid.isBlocked(to.c, to.r)) return attackReady ? { kind: 'wall' } : { kind: 'still' };
  return { kind: 'move', to };
}

/** 그 방향을 바라보는 각도 (three의 rotation.y와 같은 기준) */
export const faceAngle = (dc: number, dr: number): number => Math.atan2(dc, dr);
