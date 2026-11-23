/**
 * 지역 보스(고블린 왕): HP를 일정량 깎을 때마다 퀴즈 한 문제 (마지막 HP 0에서는 원래대로 연속 문제).
 * - 맞히면: 왕이 휘청이며 추가 피해 (최대 HP의 bonus 비율)
 * - 틀리면: 일반 오답처럼 왕이 조금 회복
 * phases: 퀴즈가 나오는 HP 비율. 예 [2/3, 1/3] → HP가 2/3, 1/3 아래로 처음 내려갈 때
 */

/** 이번 공격으로 처음 넘어선 단계 번호 (없으면 -1). done: 이미 끝낸 단계 수 */
export function crossedPhase(hpBefore: number, hpAfter: number, maxHp: number, phases: readonly number[], done: number): number {
  for (let i = done; i < phases.length; i++) {
    const line = maxHp * phases[i];
    if (hpBefore > line && hpAfter <= line && hpAfter > 0) return i;
  }
  return -1;
}

/** 단계 퀴즈를 맞혔을 때 추가 피해 후 HP (최소 1, 0으로 만들지는 않음) */
export const phaseBonusHp = (hp: number, maxHp: number, bonus: number): number => Math.max(1, hp - Math.round(maxHp * bonus));
