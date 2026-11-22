import { describe, expect, it } from 'vitest';
import mapData from '../src/data/maps/field-01.json';
import { Grid, findSpawnCell, isCellFree, manhattan } from '../src/world/Grid';
import { seq } from './helpers';

const grid = new Grid(mapData.rows);

describe('Grid', () => {
  it('맵 크기는 11 × 17', () => {
    expect(grid.width).toBe(11);
    expect(grid.height).toBe(17);
  });

  it('풀밭은 걸을 수 있고, 나무·바위·덤불·맵 밖은 막힘', () => {
    expect(grid.isBlocked(1, 1)).toBe(false);
    expect(grid.isBlocked(0, 0)).toBe(true); // 나무
    expect(grid.isBlocked(3, 2)).toBe(true); // 바위 R
    expect(grid.isBlocked(8, 2)).toBe(true); // 덤불 B
    expect(grid.isBlocked(-1, 5)).toBe(true);
    expect(grid.isBlocked(5, 17)).toBe(true);
  });

  it('시작 칸은 걸을 수 있는 칸', () => {
    expect(grid.isBlocked(mapData.start.c, mapData.start.r)).toBe(false);
  });

  it('줄 길이가 다르면 에러', () => {
    expect(() => new Grid(['...', '..'])).toThrow();
  });

  it('칸 → 3D 좌표: 맵 가운데가 0', () => {
    expect(grid.worldX(5)).toBe(0);
    expect(grid.worldZ(8)).toBe(0);
    expect(grid.worldX(0)).toBe(-5);
  });
});

describe('점유 체크', () => {
  it('누가 서 있는 칸은 비어 있지 않음', () => {
    expect(isCellFree(grid, 2, 2, [{ c: 2, r: 2 }])).toBe(false);
    expect(isCellFree(grid, 2, 2, [{ c: 2, r: 3 }])).toBe(true);
  });
  it('막힌 칸은 비어 있지 않음', () => {
    expect(isCellFree(grid, 3, 2, [])).toBe(false);
  });
  it('manhattan 거리 = 가로 차이 + 세로 차이', () => {
    expect(manhattan({ c: 1, r: 1 }, { c: 4, r: 5 })).toBe(7);
  });
});

describe('등장 칸 고르기', () => {
  const area = mapData.spawnArea;
  it('빈 칸이고 플레이어와 5칸 이상 떨어진 곳', () => {
    const player = { c: 5, r: 15 };
    for (let s = 0; s < 50; s++) {
      const cell = findSpawnCell(grid, area, [player], player, 5, Math.random, 200);
      expect(isCellFree(grid, cell.c, cell.r, [player])).toBe(true);
      expect(manhattan(cell, player)).toBeGreaterThanOrEqual(5);
      expect(cell.r).toBeGreaterThanOrEqual(1);
      expect(cell.r).toBeLessThanOrEqual(8);
    }
  });
  it('첫 후보가 막혀 있으면 다시 뽑음', () => {
    // 첫 후보 (3,2)=바위 → 두 번째 후보 (1,1)
    const cell = findSpawnCell(grid, area, [], { c: 5, r: 15 }, 5, seq(2 / 9, 1 / 8, 0, 0), 200);
    expect(cell).toEqual({ c: 1, r: 1 });
  });
});
