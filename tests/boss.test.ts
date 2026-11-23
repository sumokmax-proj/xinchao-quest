import { describe, expect, it } from 'vitest';
import { crossedPhase, phaseBonusHp } from '../src/combat/BossPhases';

const P = [2 / 3, 1 / 3];

describe('지역 보스 단계 퀴즈', () => {
  it('2/3 선을 처음 넘으면 0단계', () => {
    expect(crossedPhase(100, 60, 120, P, 0)).toBe(0); // 선 = 80
  });
  it('선을 안 넘으면 -1', () => {
    expect(crossedPhase(120, 90, 120, P, 0)).toBe(-1);
  });
  it('이미 끝낸 단계는 다시 안 나옴', () => {
    expect(crossedPhase(100, 60, 120, P, 1)).toBe(-1);
    expect(crossedPhase(50, 30, 120, P, 1)).toBe(1); // 선 = 40
  });
  it('한 번에 두 선을 넘으면 앞 단계부터', () => {
    expect(crossedPhase(100, 20, 120, P, 0)).toBe(0);
  });
  it('HP 0이 되면 단계 퀴즈가 아니라 마무리 퀴즈', () => {
    expect(crossedPhase(30, 0, 120, P, 1)).toBe(-1);
  });
  it('추가 피해는 최대 HP 비율, 0으로 만들지 않음', () => {
    expect(phaseBonusHp(70, 120, 0.1)).toBe(58);
    expect(phaseBonusHp(5, 120, 0.1)).toBe(1);
  });
});
