import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/config';
import { decideBump } from '../src/combat/BumpAttack';
import { applyDamage, expToNext, gainExp, recoverHp, rollDamage } from '../src/combat/rules';
import { telegraphDone, telegraphHits } from '../src/combat/Telegraph';
import { Grid } from '../src/world/Grid';
import { seq } from './helpers';

const grid = new Grid(['#####', '#...#', '#...#', '#####'].map((r) => r.replace(/#/g, 'T')));

describe('범프 공격', () => {
  const enemy = { dazed: false };
  const at = (c: number, r: number) => (c === 2 && r === 1 ? enemy : undefined);

  it('빈 칸이면 이동', () => {
    expect(decideBump({ c: 1, r: 2 }, 'right', grid, at, true)).toEqual({ kind: 'move', to: { c: 2, r: 2 } });
  });
  it('적이 있는 칸으로 가면 공격', () => {
    expect(decideBump({ c: 1, r: 1 }, 'right', grid, at, true)).toEqual({ kind: 'attack', target: enemy });
  });
  it('쿨다운 중이면 기다림 (입력 유지)', () => {
    expect(decideBump({ c: 1, r: 1 }, 'right', grid, at, false).kind).toBe('wait');
  });
  it('빈사 상태 적은 때리지 않음', () => {
    const dazed = { dazed: true };
    expect(decideBump({ c: 1, r: 1 }, 'right', grid, () => dazed, true).kind).toBe('ignore');
  });
  it('나무 쪽은 벽 부딪힘', () => {
    expect(decideBump({ c: 1, r: 1 }, 'up', grid, at, true).kind).toBe('wall');
  });
  it('부딪힌 직후(쿨다운 중) 또 나무 쪽이면 소리 없이 가만히', () => {
    expect(decideBump({ c: 1, r: 1 }, 'up', grid, at, false).kind).toBe('still');
  });
  it('쿨다운 중이어도 빈 칸으로는 이동', () => {
    expect(decideBump({ c: 1, r: 2 }, 'right', grid, at, false).kind).toBe('move');
  });
});

describe('데미지', () => {
  it('일반 공격: 공격력 10 × 0.9~1.1 → 9~11', () => {
    expect(rollDamage(10, seq(0.5, 0))).toEqual({ damage: 9, crit: false });
    expect(rollDamage(10, seq(0.5, 0.999))).toEqual({ damage: 11, crit: false });
  });
  it('크리티컬(18% 미만이 나오면): 1.6배', () => {
    expect(rollDamage(10, seq(0.1, 0.5))).toEqual({ damage: 16, crit: true });
    expect(rollDamage(10, seq(0.18, 0.5)).crit).toBe(false);
  });
  it('HP는 0 밑으로 내려가지 않음', () => {
    expect(applyDamage(5, 9)).toBe(0);
    expect(applyDamage(30, 9)).toBe(21);
  });
});

describe('오답 회복', () => {
  it('최대 HP의 15%로 회복 (반올림)', () => {
    expect(recoverHp(30)).toBe(5); // 4.5 → 5
    expect(recoverHp(70)).toBe(11); // 10.5 → 11
  });
  it('최소 1', () => {
    expect(recoverHp(2)).toBe(1);
  });
});

describe('경험치·레벨업', () => {
  const base = { level: 1, exp: 0, attack: 10, hp: 50, maxHp: 100 };
  it('필요 EXP: 30, 50, 70 ...', () => {
    expect(expToNext(1)).toBe(30);
    expect(expToNext(3)).toBe(70);
  });
  it('30 EXP면 Lv2, 공격력 +3, 최대 HP +10, HP +25', () => {
    const { stats, levelUps } = gainExp(base, 30);
    expect(levelUps).toEqual([{ level: 2, attack: 13 }]);
    expect(stats).toEqual({ level: 2, exp: 0, attack: 13, hp: 75, maxHp: 110 });
  });
  it('한 번에 여러 레벨', () => {
    expect(gainExp(base, 85).levelUps.map((u) => u.level)).toEqual([2, 3]);
  });
  it('HP는 최대 HP를 넘지 않음', () => {
    expect(gainExp({ ...base, hp: 100 }, 30).stats.hp).toBe(110);
  });
});

describe('빨간 예고', () => {
  const t = { cells: [{ c: 3, r: 4 }], elapsed: 0.78, duration: CONFIG.enemies.goblin.telegraph };
  it('예고 시간이 지나면 끝', () => {
    expect(telegraphDone(t)).toBe(true);
    expect(telegraphDone({ ...t, elapsed: 0.5 })).toBe(false);
  });
  it('그 칸에 남아 있으면 맞고, 피했으면 안 맞음', () => {
    expect(telegraphHits(t, { c: 3, r: 4 }, 100)).toBe(true);
    expect(telegraphHits(t, { c: 4, r: 4 }, 100)).toBe(false);
  });
  it('이미 쓰러졌으면 안 맞음', () => {
    expect(telegraphHits(t, { c: 3, r: 4 }, 0)).toBe(false);
  });
});
