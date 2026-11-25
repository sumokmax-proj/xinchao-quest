import { describe, expect, it } from 'vitest';
import { makeQuestion, type Word } from '../src/combat/QuizSystem';
import { addDays, dueWords, recordReview, sanitizeReview, type ReviewState } from '../src/core/Review';
import { clearProgress, defaultSave, parseSave } from '../src/core/Save';
import { seq } from './helpers';

const IV = [1, 3, 7];
const answer = (s: ReviewState, ok: boolean, day: string) => recordReview(s, 'chợ', ok, day, IV);

describe('간격 복습 (부활 단어)', () => {
  it('날짜 더하기는 달을 넘어가도 맞게', () => {
    expect(addDays('2026-11-29', 3)).toBe('2026-12-02');
  });

  it('틀리면 다음 날 부활, 그 전에는 안 나옴', () => {
    const s = answer({}, false, '2026-11-25').state;
    expect(dueWords(s, '2026-11-25')).toEqual([]);
    expect(dueWords(s, '2026-11-26')).toEqual(['chợ']);
    expect(dueWords(s, '2026-12-30')).toEqual(['chợ']);
  });

  it('부활할 때마다 맞히면 1일 → 3일 → 7일, 그다음 졸업', () => {
    let s = answer({}, false, '2026-11-01').state;
    let r = answer(s, true, '2026-11-02');
    expect(r).toMatchObject({ revived: true, graduated: false });
    expect(r.state['chợ']).toEqual({ step: 1, due: '2026-11-05' });
    r = answer(r.state, true, '2026-11-05');
    expect(r.state['chợ']).toEqual({ step: 2, due: '2026-11-12' });
    r = answer(r.state, true, '2026-11-12');
    expect(r).toMatchObject({ revived: true, graduated: true });
    expect(r.state).toEqual({});
  });

  it('부활 전에 맞힌 것은 일정을 당기지 않는다', () => {
    const s = answer({}, false, '2026-11-01').state;
    const r = answer(s, true, '2026-11-01');
    expect(r).toMatchObject({ revived: false });
    expect(r.state).toBe(s);
  });

  it('중간에 틀리면 처음부터', () => {
    let s = answer({}, false, '2026-11-01').state;
    s = answer(s, true, '2026-11-02').state;
    s = answer(s, false, '2026-11-05').state;
    expect(s['chợ']).toEqual({ step: 0, due: '2026-11-06' });
  });

  it('틀린 적 없는 단어는 일정이 생기지 않는다', () => {
    expect(answer({}, true, '2026-11-01').state).toEqual({});
  });

  it('저장: 깨진 항목은 버리고, 진행 초기화로 지워진다', () => {
    expect(sanitizeReview({ a: { step: 1, due: '2026-11-01' }, b: { due: 'x' }, c: 3 })).toEqual({ a: { step: 1, due: '2026-11-01' } });
    expect(parseSave(null).review).toEqual({});
    expect(clearProgress({ ...defaultSave(), review: { a: { step: 0, due: '2026-11-01' } } }).review).toEqual({});
  });

  it('부활 단어를 지정해서 문제를 낼 수 있다 (정답은 그 단어)', () => {
    const words: Word[] = [
      { vi: 'mua', ko: '사다' },
      { vi: 'bán', ko: '팔다' },
      { vi: 'cá', ko: '생선' },
    ];
    for (const r of [0, 0.3, 0.6, 0.99]) {
      const q = makeQuestion(words, {}, seq(r, 0.5, r), 0.4, 0.4, words[2]);
      expect(q.word.vi).toBe('cá');
      expect(q.options).toContain(q.answer);
      expect(new Set(q.options).size).toBe(2);
    }
  });
});
