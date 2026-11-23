import type { Cell } from '../world/Grid';

/**
 * 공격 모양 (몬스터마다 다름. 빨간 예고 칸의 모양이 곧 "어디로 피해야 하는지"를 알려준다)
 * - single: 바로 앞 1칸
 * - line2:  앞으로 2칸 일직선 (물소 들이받기) → 옆으로 피한다
 * - wide:   앞 칸과 그 좌우 (들개 물어뜯기) → 뒤로 물러난다
 * - ranged: 떨어져서 일직선으로 최대 range칸 (개구리 물총) → 줄에서 벗어난다
 * - slam:   자기 주변 8칸 (고블린 왕 내려찍기) → 두 칸 떨어진다
 */
export type AttackPattern = 'single' | 'line2' | 'wide' | 'ranged' | 'slam';

/** 빨간 예고. 시간이 다 되면 그 칸들 중 하나에 플레이어가 아직 있을 때만 맞는다. */
export interface TelegraphState {
  cells: Cell[];
  elapsed: number;
  duration: number;
}

/** 0(막 시작) ~ 1(공격 순간) */
export const telegraphProgress = (t: TelegraphState): number => t.elapsed / t.duration;

export const telegraphDone = (t: TelegraphState): boolean => t.elapsed >= t.duration;

/** 예고가 끝난 순간, 플레이어가 예고 칸에 남아 있고 살아 있으면 맞는다 */
export const telegraphHits = (t: TelegraphState, player: Cell, playerHp: number): boolean =>
  playerHp > 0 && t.cells.some((c) => c.c === player.c && c.r === player.r);

type Blocked = (c: number, r: number) => boolean;

/**
 * 공격 모양대로 예고할 칸들. me: 몬스터 칸, target: 노리는 칸(플레이어).
 * 나무·벽 같은 막힌 칸은 빠진다. ranged는 막힌 칸에서 끊긴다.
 */
export function attackCells(pattern: AttackPattern, me: Cell, target: Cell, isBlocked: Blocked, range = 4): Cell[] {
  const dc = Math.sign(target.c - me.c);
  const dr = Math.sign(target.r - me.r);
  const open = (c: Cell) => !isBlocked(c.c, c.r);
  switch (pattern) {
    case 'single':
      return [{ ...target }];
    case 'line2':
      return [{ ...target }, { c: target.c + dc, r: target.r + dr }].filter(open);
    case 'wide': {
      // 앞 칸 + 공격 방향과 수직인 양옆
      const side = dc !== 0 ? { c: 0, r: 1 } : { c: 1, r: 0 };
      return [
        { c: target.c - side.c, r: target.r - side.r },
        { ...target },
        { c: target.c + side.c, r: target.r + side.r },
      ].filter(open);
    }
    case 'ranged': {
      const out: Cell[] = [];
      for (let i = 1; i <= range; i++) {
        const c = { c: me.c + dc * i, r: me.r + dr * i };
        if (!open(c)) break;
        out.push(c);
      }
      return out;
    }
    case 'slam': {
      const out: Cell[] = [];
      for (let r = -1; r <= 1; r++) for (let c = -1; c <= 1; c++) if (c || r) out.push({ c: me.c + c, r: me.r + r });
      return out.filter(open);
    }
  }
}

/** 원거리: 같은 줄(가로나 세로)에 있고, range칸 안이고, 사이에 막힌 칸이 없으면 쏠 수 있다 */
export function canShoot(me: Cell, player: Cell, range: number, isBlocked: Blocked): boolean {
  if (me.c !== player.c && me.r !== player.r) return false;
  const dist = Math.abs(me.c - player.c) + Math.abs(me.r - player.r);
  if (dist < 1 || dist > range) return false;
  const dc = Math.sign(player.c - me.c);
  const dr = Math.sign(player.r - me.r);
  for (let i = 1; i < dist; i++) if (isBlocked(me.c + dc * i, me.r + dr * i)) return false;
  return true;
}
