/**
 * 오늘의 목표와 연속 출석 (순수 로직). 하루에 정답을 goal개 채우면 보상.
 * 보상은 학습 행동(정답)에만 붙는다 (decisions-log #15).
 * 날짜는 기기의 현지 날짜 "YYYY-MM-DD" 글자로 다룬다.
 */
export interface DailyState {
  day: string; // count를 센 날
  count: number; // 그날 맞힌 문제 수
  lastDone: string; // 마지막으로 목표를 채운 날 ('' = 아직 없음)
  streak: number; // lastDone까지 연속으로 채운 날 수
}

export const freshDaily = (): DailyState => ({ day: '', count: 0, lastDone: '', streak: 0 });

const pad = (n: number) => String(n).padStart(2, '0');

export const dayKey = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** 하루 전 날짜. 달·해가 바뀌어도 맞게 */
export function previousDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d - 1, 12));
}

/** 화면에 보여줄 오늘 상태. 어제도 오늘도 못 채웠으면 연속은 끊긴 것(0) */
export function dailyView(s: DailyState, today: string, goal: number): { count: number; goal: number; done: boolean; streak: number } {
  const count = s.day === today ? Math.min(s.count, goal) : 0;
  const done = s.lastDone === today;
  const streak = done || s.lastDone === previousDay(today) ? s.streak : 0;
  return { count: done ? goal : count, goal, done, streak };
}

/** 정답 하나. justDone: 이번 정답으로 오늘의 목표를 막 채웠나 */
export function recordCorrect(s: DailyState, today: string, goal: number): { state: DailyState; justDone: boolean } {
  const count = (s.day === today ? s.count : 0) + 1;
  const state: DailyState = { ...s, day: today, count };
  if (count < goal || s.lastDone === today) return { state, justDone: false };
  const streak = s.lastDone === previousDay(today) ? s.streak + 1 : 1;
  return { state: { ...state, lastDone: today, streak }, justDone: true };
}

/** 목표 달성 보상: 기본 + 연속 하루마다 보너스 (보너스는 maxBonusDays일까지) */
export const dailyReward = (streak: number, base: number, perDay: number, maxBonusDays: number): number =>
  base + perDay * Math.min(Math.max(0, streak - 1), maxBonusDays);

export function sanitizeDaily(raw: unknown): DailyState {
  const d = freshDaily();
  if (!raw || typeof raw !== 'object') return d;
  const r = raw as Record<string, unknown>;
  const day = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '');
  const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);
  return { day: day(r.day), count: n(r.count), lastDone: day(r.lastDone), streak: n(r.streak) };
}
