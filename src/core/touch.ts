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

export interface GestureAction {
  type: 'press' | 'release';
  dir: Dir;
}

/**
 * 스와이프 한 번의 터치 (손가락을 댈 때부터 뗄 때까지).
 * 일정 거리를 넘는 순간 출발하고, 대고 있으면 계속 걷고, 다시 밀면 방향이 바뀐다.
 * answering: 지금 방향 입력이 "답"인가(퀴즈·마을 질문).
 * 답은 퀴즈가 뜬 "뒤에 새로 댄" 손가락만, 한 번 밀 때 하나. 걷던 손가락이 흘러가 답이 눌리는 일이 없게.
 */
export class SwipeGesture {
  private x = 0;
  private y = 0;
  private dir: Dir | null = null;
  private active = false;
  private startedAnswering = false;

  constructor(private readonly min: number) {}

  down(x: number, y: number, answering: boolean): GestureAction[] {
    const out = this.up();
    this.x = x;
    this.y = y;
    this.active = true;
    this.startedAnswering = answering;
    return out;
  }

  move(x: number, y: number, answering: boolean): GestureAction[] {
    if (!this.active || (answering && !this.startedAnswering)) return [];
    const next = swipeDirection(x - this.x, y - this.y, this.min);
    if (!next) return [];
    // 기준점을 손가락 위치로 옮겨서, 거기서 다시 밀면 방향을 바꿀 수 있게
    this.x = x;
    this.y = y;
    if (answering) {
      this.active = false; // 한 번 터치로 답 하나
      return [
        { type: 'press', dir: next },
        { type: 'release', dir: next },
      ];
    }
    if (next === this.dir) return [];
    const out: GestureAction[] = this.dir ? [{ type: 'release', dir: this.dir }] : [];
    this.dir = next;
    out.push({ type: 'press', dir: next });
    return out;
  }

  up(): GestureAction[] {
    const out: GestureAction[] = this.dir ? [{ type: 'release', dir: this.dir }] : [];
    this.dir = null;
    this.active = false;
    return out;
  }
}
