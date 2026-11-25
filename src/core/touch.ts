import type { Dir } from '../world/Grid';

/** 화면에서 (dx, dy)만큼 떨어진 쪽의 4방향. 가로·세로 중 더 많이 벗어난 쪽 */
const toDir = (dx: number, dy: number): Dir => (Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');

/**
 * D-pad 전체를 한 판으로 본다: (dx, dy)는 D-pad 가운데에서 손가락까지의 거리(px).
 * 모서리 빈칸을 눌러도 가까운 방향이 되고, 한가운데(dead 안쪽)는 아무 방향도 아니다.
 * current: 지금 누르고 있는 방향. 대각선 경계에서 손가락이 조금 흔들려도 방향이 왔다 갔다 하지 않게,
 * 다른 축이 sticky(px) 넘게 더 커야 바꾼다.
 */
export function padDirection(dx: number, dy: number, dead: number, current: Dir | null = null, sticky = 0): Dir | null {
  if (Math.hypot(dx, dy) < dead) return current;
  const next = toDir(dx, dy);
  if (current && next !== current) {
    const along = current === 'left' ? -dx : current === 'right' ? dx : current === 'up' ? -dy : dy;
    const other = next === 'left' || next === 'right' ? Math.abs(dx) : Math.abs(dy);
    if (along > 0 && other - along < sticky) return current;
  }
  return next;
}

/** 스와이프: 시작점에서 min(px) 넘게 움직였으면 그 방향 */
export const swipeDirection = (dx: number, dy: number, min: number): Dir | null => (Math.max(Math.abs(dx), Math.abs(dy)) < min ? null : toDir(dx, dy));
