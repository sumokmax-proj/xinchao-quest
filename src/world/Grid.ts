import { type Rng } from '../core/random';

export type Dir = 'up' | 'down' | 'left' | 'right';
export interface Cell {
  c: number; // 열 (가로 위치)
  r: number; // 행 (세로 위치)
}
export interface Step {
  dc: number;
  dr: number;
}

export const DIRS: Record<Dir, Step> = {
  up: { dc: 0, dr: -1 },
  down: { dc: 0, dr: 1 },
  left: { dc: -1, dr: 0 },
  right: { dc: 1, dr: 0 },
};

export interface SpawnArea {
  minC: number;
  maxC: number;
  minR: number;
  maxR: number;
}

export interface MapData {
  name: string;
  theme?: string; // 색·소품 분위기 (render/themes.ts)
  rows: string[];
  start: Cell;
  spawnArea: SpawnArea;
}

export const FLOOR = '.';

/** 타일 격자. 글자 한 개 = 한 칸. '.'만 걸을 수 있다. */
export class Grid {
  readonly width: number;
  readonly height: number;

  constructor(readonly rows: readonly string[]) {
    if (rows.length === 0) throw new Error('맵이 비어 있음');
    this.width = rows[0].length;
    this.height = rows.length;
    rows.forEach((row, i) => {
      if (row.length !== this.width) throw new Error(`맵 ${i}번째 줄 길이가 다름`);
    });
  }

  inBounds(c: number, r: number): boolean {
    return c >= 0 && r >= 0 && c < this.width && r < this.height;
  }

  tileAt(c: number, r: number): string | null {
    return this.inBounds(c, r) ? this.rows[r][c] : null;
  }

  /** 맵 밖이거나 나무·바위·덤불이면 막힘 */
  isBlocked(c: number, r: number): boolean {
    return this.tileAt(c, r) !== FLOOR;
  }

  /** 칸 번호 → 3D 좌표 (맵 가운데가 0) */
  worldX(c: number): number {
    return c - (this.width - 1) / 2;
  }
  worldZ(r: number): number {
    return r - (this.height - 1) / 2;
  }
}

export const manhattan = (a: Cell, b: Cell): number => Math.abs(a.c - b.c) + Math.abs(a.r - b.r);

/** 막히지 않았고, 누가(플레이어·다른 고블린) 서 있지도 않은 칸인가 */
export function isCellFree(grid: Grid, c: number, r: number, occupied: readonly Cell[]): boolean {
  return !grid.isBlocked(c, r) && !occupied.some((o) => o.c === c && o.r === r);
}

/**
 * 고블린 등장 칸 고르기 (프로토타입과 같은 방식).
 * 등장 구역 안에서 무작위로 뽑되, 빈 칸이고 플레이어와 minDist 이상 떨어져야 한다.
 * maxTries번 안에 못 찾으면 마지막으로 뽑은 칸을 그대로 쓴다.
 */
export function findSpawnCell(
  grid: Grid,
  area: SpawnArea,
  occupied: readonly Cell[],
  player: Cell,
  minDist: number,
  rng: Rng,
  maxTries: number,
): Cell {
  const cols = area.maxC - area.minC + 1;
  const rowsN = area.maxR - area.minR + 1;
  let cell: Cell = { c: area.minC, r: area.minR };
  for (let i = 0; i < maxTries; i++) {
    cell = { c: area.minC + Math.floor(rng() * cols), r: area.minR + Math.floor(rng() * rowsN) };
    if (isCellFree(grid, cell.c, cell.r, occupied) && manhattan(cell, player) >= minDist) break;
  }
  return cell;
}
