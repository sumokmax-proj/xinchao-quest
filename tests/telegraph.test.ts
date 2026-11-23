import { describe, expect, it } from 'vitest';
import { attackCells, canShoot } from '../src/combat/Telegraph';

// 5×5 맵. (2,0)만 벽
const wall = (c: number, r: number) => c < 0 || r < 0 || c > 4 || r > 4 || (c === 2 && r === 0);
const me = { c: 2, r: 2 };

describe('공격 모양 (예고 칸)', () => {
  it('single: 노리는 칸 하나', () => {
    expect(attackCells('single', me, { c: 3, r: 2 }, wall)).toEqual([{ c: 3, r: 2 }]);
  });
  it('line2: 앞으로 2칸 일직선', () => {
    expect(attackCells('line2', me, { c: 3, r: 2 }, wall)).toEqual([{ c: 3, r: 2 }, { c: 4, r: 2 }]);
  });
  it('line2: 두 번째 칸이 벽이면 빠짐', () => {
    expect(attackCells('line2', me, { c: 2, r: 1 }, wall)).toEqual([{ c: 2, r: 1 }]);
  });
  it('wide: 오른쪽을 노리면 그 칸의 위·아래까지 (세로 3칸)', () => {
    expect(attackCells('wide', me, { c: 3, r: 2 }, wall)).toEqual([{ c: 3, r: 1 }, { c: 3, r: 2 }, { c: 3, r: 3 }]);
  });
  it('wide: 위를 노리면 그 칸의 좌·우 (가로 3칸)', () => {
    expect(attackCells('wide', me, { c: 2, r: 1 }, wall)).toEqual([{ c: 1, r: 1 }, { c: 2, r: 1 }, { c: 3, r: 1 }]);
  });
  it('ranged: 자기 앞부터 일직선, 맵 끝·벽에서 끊김', () => {
    expect(attackCells('ranged', me, { c: 4, r: 2 }, wall, 4)).toEqual([{ c: 3, r: 2 }, { c: 4, r: 2 }]);
    expect(attackCells('ranged', me, { c: 2, r: 1 }, wall, 4)).toEqual([{ c: 2, r: 1 }]);
  });
  it('slam: 주변 8칸 (벽 빼고)', () => {
    expect(attackCells('slam', me, { c: 3, r: 2 }, wall)).toHaveLength(8);
    expect(attackCells('slam', { c: 2, r: 1 }, me, wall)).toHaveLength(7);
  });
});

describe('원거리 사격 가능 여부', () => {
  it('같은 줄, 사거리 안, 막힘 없음', () => {
    expect(canShoot({ c: 0, r: 2 }, { c: 4, r: 2 }, 4, wall)).toBe(true);
  });
  it('대각선이면 못 쏨', () => {
    expect(canShoot({ c: 0, r: 0 }, { c: 1, r: 1 }, 4, wall)).toBe(false);
  });
  it('사거리 밖이면 못 쏨', () => {
    expect(canShoot({ c: 0, r: 2 }, { c: 4, r: 2 }, 3, wall)).toBe(false);
  });
  it('사이에 벽이 있으면 못 쏨', () => {
    expect(canShoot({ c: 1, r: 0 }, { c: 3, r: 0 }, 4, wall)).toBe(false);
  });
});
