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
  it('같은 줄 사이에 바위가 있으면 옆으로 돌아감 (멈추지 않음)', () => {
    // 고블린 (2,0), 바위 (2,1), 플레이어 (2,4) → 세로로 바로 못 가니 옆으로 비킴
    const rock = (c: number, r: number) => c >= 0 && r >= 0 && c < 5 && r < 5 && !(c === 2 && r === 1);
    const { step } = chooseGoblinStep({ c: 2, r: 0 }, { c: 2, r: 4 }, 'goblin', 1.5, rock, seq(0));
    expect(step).not.toBeNull();
    expect(step!.dr).toBe(0);
  });
  it('긴 나무 벽은 끝까지 돌아감', () => {
    // 가로 나무 벽 (0~3, 2). 고블린 (1,0), 플레이어 (1,4) → 오른쪽 끝(4)의 틈으로 돌아가야 함
    // 아래로 먼저 가든 오른쪽으로 먼저 가든 걸음 수가 같아서 둘 다 정답. 왼쪽·위는 오답
    const wall = (c: number, r: number) => c >= 0 && r >= 0 && c < 5 && r < 5 && !(r === 2 && c <= 3);
    const { step } = chooseGoblinStep({ c: 1, r: 0 }, { c: 1, r: 4 }, 'goblin', 1.5, wall, seq(0));
    expect([{ dc: 0, dr: 1 }, { dc: 1, dr: 0 }]).toContainEqual(step);
    // 벽 바로 위 (1,1)에서는 오른쪽뿐
    const next = chooseGoblinStep({ c: 1, r: 1 }, { c: 1, r: 4 }, 'goblin', 1.5, wall, seq(0));
    expect(next.step).toEqual({ dc: 1, dr: 0 });
  });
  it('플레이어 쪽으로 가는 길이 아예 없으면 갈 수 있는 쪽으로라도 (기존 규칙)', () => {
    // 가로 벽이 맵 끝까지 막힘 → 길 없음. 세로 한 칸은 비어 있으니 그쪽으로
    const sealed = (c: number, r: number) => c >= 0 && r >= 0 && c < 5 && r < 5 && r !== 2;
    const { step } = chooseGoblinStep({ c: 1, r: 0 }, { c: 1, r: 4 }, 'goblin', 1.5, sealed, seq(0));
    expect(step).toEqual({ dc: 0, dr: 1 });
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
