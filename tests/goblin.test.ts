import { describe, expect, it } from 'vitest';
import { chooseGoblinStep, isAdjacent } from '../src/entities/goblinBrain';
import { seq } from './helpers';

const free = () => true;

describe('고블린 이동', () => {
  it('가까우면 더 멀리 떨어진 축으로 플레이어 쪽 한 칸', () => {
    const { step } = chooseGoblinStep({ c: 2, r: 2 }, { c: 5, r: 3 }, 'goblin', 1.5, free, seq(0));
    expect(step).toEqual({ dc: 1, dr: 0 });
    const v = chooseGoblinStep({ c: 2, r: 2 }, { c: 3, r: 6 }, 'goblin', 1.5, free, seq(0));
    expect(v.step).toEqual({ dc: 0, dr: 1 });
  });
  it('그쪽이 막혀 있으면 다른 축으로', () => {
    const blockedRight = (c: number, r: number) => !(c === 3 && r === 2);
    const { step } = chooseGoblinStep({ c: 2, r: 2 }, { c: 5, r: 0 }, 'goblin', 1.5, blockedRight, seq(0));
    expect(step).toEqual({ dc: 0, dr: -1 });
  });
  it('둘 다 막히면 제자리', () => {
    const { step } = chooseGoblinStep({ c: 2, r: 2 }, { c: 5, r: 5 }, 'goblin', 1.5, () => false, seq(0));
    expect(step).toBeNull();
  });
  it('추격 걸음 간격: 일반 0.55~0.85초, 대장 0.45~0.75초', () => {
    expect(chooseGoblinStep({ c: 0, r: 0 }, { c: 3, r: 0 }, 'goblin', 1.5, free, seq(0)).cooldown).toBeCloseTo(0.55);
    expect(chooseGoblinStep({ c: 0, r: 0 }, { c: 3, r: 0 }, 'boss', 1.5, free, seq(0.999)).cooldown).toBeCloseTo(0.75, 2);
  });
  it('7칸보다 멀면 어슬렁 (간격 = 고블린별 값 + 0~0.6초)', () => {
    const { step, cooldown } = chooseGoblinStep({ c: 0, r: 0 }, { c: 8, r: 0 }, 'goblin', 1.5, free, seq(0));
    expect(step).not.toBeNull();
    expect(cooldown).toBeCloseTo(1.5);
  });
  it('바로 옆 칸 판정', () => {
    expect(isAdjacent({ c: 1, r: 1 }, { c: 1, r: 2 })).toBe(true);
    expect(isAdjacent({ c: 1, r: 1 }, { c: 2, r: 2 })).toBe(false);
  });
});
