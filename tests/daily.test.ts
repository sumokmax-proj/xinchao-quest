import { describe, expect, it } from 'vitest';
import { dailyReward, dailyView, dayKey, freshDaily, previousDay, recordCorrect, sanitizeDaily, type DailyState } from '../src/core/Daily';
import { clearProgress, defaultSave, parseSave } from '../src/core/Save';

/** 하루에 n번 정답 */
function play(s: DailyState, day: string, n: number, goal = 10): { state: DailyState; completions: number } {
  let completions = 0;
  for (let i = 0; i < n; i++) {
    const r = recordCorrect(s, day, goal);
    s = r.state;
    if (r.justDone) completions++;
  }
  return { state: s, completions };
}

describe('날짜', () => {
  it('현지 날짜를 글자로', () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
  it('하루 전: 달·해·윤년을 넘어가도', () => {
    expect(previousDay('2026-03-01')).toBe('2026-02-28');
    expect(previousDay('2028-03-01')).toBe('2028-02-29');
    expect(previousDay('2026-01-01')).toBe('2025-12-31');
  });
});

describe('오늘의 목표', () => {
  it('목표를 채우는 순간 딱 한 번만 완료', () => {
    const r = play(freshDaily(), '2026-11-25', 25);
    expect(r.completions).toBe(1);
    expect(dailyView(r.state, '2026-11-25', 10)).toEqual({ count: 10, goal: 10, done: true, streak: 1 });
  });

  it('날이 바뀌면 개수는 0부터', () => {
    const r = play(freshDaily(), '2026-11-25', 7);
    expect(dailyView(r.state, '2026-11-26', 10)).toMatchObject({ count: 0, done: false });
    expect(play(r.state, '2026-11-26', 9).completions).toBe(0);
  });

  it('이어서 채우면 연속이 늘고, 하루 거르면 다시 1부터', () => {
    let s = play(freshDaily(), '2026-11-25', 10).state;
    s = play(s, '2026-11-26', 10).state;
    expect(dailyView(s, '2026-11-26', 10).streak).toBe(2);
    // 다음 날 아침: 아직 안 풀었어도 어제까지의 연속은 살아 있음
    expect(dailyView(s, '2026-11-27', 10).streak).toBe(2);
    // 하루를 통째로 거르면 0
    expect(dailyView(s, '2026-11-28', 10).streak).toBe(0);
    expect(play(s, '2026-11-28', 10).state.streak).toBe(1);
  });

  it('보상: 연속일수록 조금 더, 정해진 날까지만', () => {
    expect(dailyReward(1, 20000, 5000, 6)).toBe(20000);
    expect(dailyReward(3, 20000, 5000, 6)).toBe(30000);
    expect(dailyReward(30, 20000, 5000, 6)).toBe(50000);
  });
});

describe('저장', () => {
  it('깨진 값은 안전하게 고친다', () => {
    expect(sanitizeDaily({ day: 'x', count: -3, lastDone: 5, streak: 2.7 })).toEqual({ day: '', count: 0, lastDone: '', streak: 2 });
    expect(parseSave(null).daily).toEqual(freshDaily());
  });
  it('진행 초기화하면 같이 지워진다', () => {
    const save = { ...defaultSave(), daily: { day: '2026-11-25', count: 3, lastDone: '', streak: 0 } };
    expect(clearProgress(save).daily).toEqual(freshDaily());
  });
});
