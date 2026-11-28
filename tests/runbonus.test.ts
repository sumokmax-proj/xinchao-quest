import { describe, expect, it } from 'vitest';
import bonusesJson from '../src/data/bonuses.json';
import { combineGuard, isStruggling, offerBonuses, pickupCells, runEffects, type BonusDef, type OfferContext } from '../src/core/RunBonus';
import { Grid, isCellFree } from '../src/world/Grid';
import { seq } from './helpers';

const DEFS = bonusesJson as BonusDef[];

function seeded(seed: number) {
  let x = seed >>> 0;
  return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296);
}

const ctx = (o: Partial<OfferContext> = {}): OfferContext => ({ taken: [], struggling: false, hasReview: true, hurt: true, ...o });

describe('판 보너스 데이터', () => {
  it('id가 겹치지 않고, 학습 보조 물건이 3개 이상', () => {
    expect(new Set(DEFS.map((d) => d.id)).size).toBe(DEFS.length);
    expect(DEFS.filter((d) => d.learn).length).toBeGreaterThanOrEqual(3);
  });
  it('이름과 효과 한 줄이 짧다 (물건 위 이름표가 화면을 가리지 않게)', () => {
    for (const d of DEFS) {
      expect(d.name.length).toBeLessThanOrEqual(8);
      expect(d.short.length).toBeLessThanOrEqual(10);
    }
  });
});

describe('주운 보너스 효과 합계', () => {
  it('아무것도 없으면 0', () => {
    expect(runEffects(DEFS, [])).toEqual({ attack: 0, crit: 0, guard: 0, gold: 0, quizTime: 0, charms: 0, review: 0 });
  });
  it('공격·크리·퀴즈 시간·부적·골드·복습이 각각 들어간다', () => {
    const fx = runEffects(DEFS, ['blade', 'feather', 'sand', 'clover', 'purse', 'scroll']);
    expect(fx.attack).toBeCloseTo(0.15);
    expect(fx.crit).toBeCloseTo(0.1);
    expect(fx.quizTime).toBeCloseTo(1.5);
    expect(fx.charms).toBe(1);
    expect(fx.gold).toBeCloseTo(0.2);
    expect(fx.review).toBe(1000);
  });
  it('회복은 주울 때 바로 쓰므로 합계에 없음', () => {
    expect(runEffects(DEFS, ['snack', 'snack'])).toEqual(runEffects(DEFS, []));
  });
  it('모르는 id는 무시 (데이터를 지워도 안전)', () => {
    expect(runEffects(DEFS, ['nope']).attack).toBe(0);
  });
  it('피해 감소는 곱해서 겹친다: 20% + 20% = 36%, 100%가 되지 않음', () => {
    expect(combineGuard(0.2, 0.2)).toBeCloseTo(0.36);
    expect(combineGuard(0.3, 0.2)).toBeCloseTo(0.44);
    expect(combineGuard(0, 0)).toBe(0);
  });
});

describe('퀴즈가 어려운가', () => {
  it('2문제 미만이면 판단하지 않음', () => {
    expect(isStruggling(0, 1, 0.25)).toBe(false);
  });
  it('틀린 비율이 기준 이상이면 어렵다', () => {
    expect(isStruggling(3, 4, 0.25)).toBe(true);
    expect(isStruggling(4, 5, 0.25)).toBe(false);
  });
});

describe('바닥에 떨어뜨릴 물건 고르기', () => {
  it('서로 다른 2개', () => {
    for (let i = 0; i < 100; i++) {
      const o = offerBonuses(DEFS, ctx(), seeded(i));
      expect(o).toHaveLength(2);
      expect(o[0].id).not.toBe(o[1].id);
    }
  });
  it('이미 주운 것은 다시 나오지 않음 (회복은 예외)', () => {
    const taken = DEFS.filter((d) => !d.repeat).map((d) => d.id).slice(0, 5);
    for (let i = 0; i < 100; i++) for (const d of offerBonuses(DEFS, ctx({ taken }), seeded(i))) expect(taken).not.toContain(d.id);
    // 회복은 주웠어도 또 나올 수 있다
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) offerBonuses(DEFS, ctx({ taken: ['snack'] }), seeded(i)).forEach((d) => seen.add(d.id));
    expect(seen.has('snack')).toBe(true);
  });
  it('퀴즈가 어려우면 학습 보조 물건이 꼭 하나 이상', () => {
    for (let i = 0; i < 200; i++) expect(offerBonuses(DEFS, ctx({ struggling: true }), seeded(i)).some((d) => d.learn)).toBe(true);
  });
  it('오답노트가 비어 있으면 복습 두루마리는 안 나옴, HP가 가득이면 회복은 안 나옴', () => {
    for (let i = 0; i < 200; i++) {
      const o = offerBonuses(DEFS, ctx({ hasReview: false, hurt: false, struggling: true }), seeded(i));
      expect(o.map((d) => d.effect)).not.toContain('review');
      expect(o.map((d) => d.effect)).not.toContain('heal');
    }
  });
  it('여러 판을 하면 모든 물건이 한 번씩은 나온다 (판마다 다른 조합)', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 300; i++) offerBonuses(DEFS, ctx(), seeded(i)).forEach((d) => seen.add(d.id));
    expect(seen.size).toBe(DEFS.length);
  });
  it('고를 게 하나뿐이면 1개, 없으면 0개', () => {
    const allButOne = DEFS.filter((d) => d.id !== 'blade').map((d) => d.id);
    const o = offerBonuses(DEFS, ctx({ taken: allButOne, hurt: false }), seq(0.3, 0.6));
    expect(o.map((d) => d.id)).toEqual(['blade']);
    expect(offerBonuses(DEFS, ctx({ taken: [...allButOne, 'blade'], hurt: false }), seq(0.5))).toEqual([]);
  });
});

describe('물건을 놓을 칸', () => {
  const open = new Grid(['.........', '.........', '.........', '.........', '.........']);
  const free = (g: Grid) => (c: number, r: number) => isCellFree(g, c, r, []);

  it('넓으면 플레이어 좌우 2칸', () => {
    expect(pickupCells({ c: 4, r: 2 }, free(open))).toEqual([
      { c: 2, r: 2 },
      { c: 6, r: 2 },
    ]);
  });
  it('막혀 있으면 가까운 빈 칸, 두 칸은 붙지 않고 플레이어 칸이 아님', () => {
    const g = new Grid(['TTTTT', 'T...T', 'T...T', 'T...T', 'TTTTT']);
    const cells = pickupCells({ c: 2, r: 2 }, free(g));
    expect(cells).toHaveLength(2);
    for (const cell of cells) {
      expect(g.isBlocked(cell.c, cell.r)).toBe(false);
      expect(cell.c === 2 && cell.r === 2).toBe(false);
    }
    const [a, b] = cells;
    expect(Math.abs(a.c - b.c) + Math.abs(a.r - b.r)).toBeGreaterThanOrEqual(2);
  });
  it('빈 칸이 없으면 빈 배열', () => {
    const g = new Grid(['TTT', 'T.T', 'TTT']);
    expect(pickupCells({ c: 1, r: 1 }, free(g))).toEqual([]);
  });
});
