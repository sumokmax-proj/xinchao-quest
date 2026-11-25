/**
 * 간격 복습 "부활 단어" (순수 로직, 기획서 "학습 설계 → 오답 부활").
 * 틀린 단어는 1일 뒤 다시 살아난다. 그날(이후) 맞히면 다음은 3일 뒤, 그다음은 7일 뒤. 7일 뒤까지 맞히면 졸업.
 * 중간에 틀리면 처음(1일 뒤)부터. 날짜는 현지 날짜 "YYYY-MM-DD" (core/Daily.ts의 dayKey).
 */
import { dayKey } from './Daily';

export interface ReviewEntry {
  step: number; // 몇 번 부활해서 맞혔나 (= 간격 목록의 몇 번째를 기다리는 중인가)
  due: string; // 이 날부터 부활
}

export type ReviewState = Record<string, ReviewEntry>;

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + n, 12));
}

/** 오늘 부활한 단어들 (날짜 글자는 그대로 크기 비교가 된다) */
export const dueWords = (s: ReviewState, today: string): string[] =>
  Object.keys(s).filter((vi) => s[vi].due <= today);

export const isDue = (s: ReviewState, vi: string, today: string): boolean => !!s[vi] && s[vi].due <= today;

/**
 * 문제 하나의 결과를 복습 일정에 반영.
 * revived: 부활한 단어를 맞혔다 (보너스 대상). graduated: 마지막 간격까지 맞혀 일정에서 빠짐.
 * 아직 부활 전인 단어를 맞힌 것은 일정을 바꾸지 않는다 (같은 날 여러 번 맞혀도 건너뛰지 않게)
 */
export function recordReview(
  s: ReviewState,
  vi: string,
  correct: boolean,
  today: string,
  intervals: readonly number[],
): { state: ReviewState; revived: boolean; graduated: boolean } {
  if (!correct) return { state: { ...s, [vi]: { step: 0, due: addDays(today, intervals[0]) } }, revived: false, graduated: false };
  if (!isDue(s, vi, today)) return { state: s, revived: false, graduated: false };
  const step = s[vi].step + 1;
  const next = { ...s };
  if (step >= intervals.length) {
    delete next[vi];
    return { state: next, revived: true, graduated: true };
  }
  next[vi] = { step, due: addDays(today, intervals[step]) };
  return { state: next, revived: true, graduated: false };
}

export function sanitizeReview(raw: unknown): ReviewState {
  const out: ReviewState = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [vi, e] of Object.entries(raw as Record<string, unknown>)) {
    const r = e as Partial<ReviewEntry> | null;
    if (!r || typeof r.due !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(r.due)) continue;
    out[vi] = { step: typeof r.step === 'number' && r.step >= 0 ? Math.floor(r.step) : 0, due: r.due };
  }
  return out;
}
