import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/config';
import { chooseFleeStep } from '../src/entities/goblinBrain';
import { Grid, isCellFree, manhattan } from '../src/world/Grid';
import { seq } from './helpers';

const open = new Grid(['...........', '...........', '...........', '...........', '...........', '...........', '...........']);
const free = (g: Grid, extra: { c: number; r: number }[] = []) => (c: number, r: number) => isCellFree(g, c, r, extra);

describe('황금 고블린: 도망치기', () => {
  it('가까우면 플레이어와 멀어지는 칸으로', () => {
    const me = { c: 5, r: 3 };
    const player = { c: 3, r: 3 };
    for (const v of [0, 0.3, 0.6, 0.9]) {
      const { step } = chooseFleeStep(me, player, 0.24, free(open), seq(v, 0.5));
      expect(step).not.toBeNull();
      expect(manhattan({ c: me.c + step!.dc, r: me.r + step!.dr }, player)).toBe(manhattan(me, player) + 1);
    }
  });

  it('멀어지는 칸이 여럿이면 사방이 트인 쪽 (구석으로 가지 않음)', () => {
    // 플레이어가 왼쪽 위 대각선. 오른쪽(→)과 아래(↓) 모두 멀어지지만, 아래는 맨 아랫줄이라 막힌 곳이 많다
    const g = new Grid(['.....', '.....', '.....', '.....']);
    const { step } = chooseFleeStep({ c: 2, r: 2 }, { c: 1, r: 1 }, 0.24, free(g), seq(0.1, 0.5));
    expect(step).toEqual({ dc: 1, dr: 0 });
  });

  it('갈 곳이 없으면 멈춤', () => {
    const g = new Grid(['TTT', 'T.T', 'TTT']);
    expect(chooseFleeStep({ c: 1, r: 1 }, { c: 1, r: 3 }, 0.24, free(g), seq(0.5)).step).toBeNull();
  });

  it('다른 몬스터나 막힌 칸으로는 가지 않음', () => {
    const me = { c: 5, r: 3 };
    const others = [{ c: 6, r: 3 }];
    const { step } = chooseFleeStep(me, { c: 4, r: 3 }, 0.24, free(open, others), seq(0.2, 0.5));
    expect(step).not.toEqual({ dc: 1, dr: 0 });
  });

  it('멀리 있으면 어슬렁 (걸음 간격이 두 배)', () => {
    const near = chooseFleeStep({ c: 9, r: 3 }, { c: 8, r: 3 }, 0.24, free(open), seq(0.5, 0));
    const far = chooseFleeStep({ c: 10, r: 6 }, { c: 0, r: 0 }, 0.24, free(open), seq(0.5, 0));
    expect(far.step).not.toBeNull();
    expect(far.cooldown).toBeCloseTo(near.cooldown * 2);
  });

  it('플레이어가 더 빠르다: 한 칸 이동 시간보다 도망 걸음이 느림 (쫓아가면 잡힘)', () => {
    const g = CONFIG.enemies.golden;
    expect(g.chaseStepDelay + g.moveDuration).toBeGreaterThan(CONFIG.player.moveDuration * 2);
    expect(g.damage).toBe(0);
  });
});
