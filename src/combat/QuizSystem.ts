import { CONFIG } from '../config';
import { pick, shuffle, type Rng } from '../core/random';
import { recoverHp } from './rules';

export interface Word {
  vi: string;
  ko: string;
  topic?: string;
}

export interface Question {
  word: Word;
  /** true: 베트남어를 보고 뜻 고르기 / false: 한국어를 보고 베트남어 고르기 */
  viToKo: boolean;
  prompt: string;
  kindLabel: string;
  /** [왼쪽 답, 오른쪽 답] */
  options: [string, string];
  answer: string;
}

/** 오답노트: 베트남어 단어 → 점수. 틀리면 1, 맞힐 때마다 +1, 3이 되면 빠진다 */
export type WrongNote = Record<string, number>;

/** 2지선다 문제 만들기. 40% 확률로 오답노트 단어를 먼저 낸다 */
export function makeQuestion(words: readonly Word[], note: WrongNote, rng: Rng, reviewChance: number = CONFIG.quiz.reviewChance): Question {
  if (words.length < 2) throw new Error('퀴즈에는 단어가 2개 이상 필요');
  const wrongKeys = Object.keys(note);
  let word: Word | undefined;
  if (wrongKeys.length && rng() < reviewChance) {
    const key = pick(rng, wrongKeys);
    word = words.find((w) => w.vi === key);
  }
  if (!word) word = pick(rng, words);
  let other: Word;
  do other = pick(rng, words);
  while (other === word);
  const viToKo = rng() < 0.5;
  const [a, b] = shuffle(rng, viToKo ? [word.ko, other.ko] : [word.vi, other.vi]);
  return {
    word,
    viToKo,
    prompt: viToKo ? word.vi : word.ko,
    kindLabel: viToKo ? '무슨 뜻?' : '베트남어로?',
    options: [a, b],
    answer: viToKo ? word.ko : word.vi,
  };
}

/** side: 0 왼쪽, 1 오른쪽, null 시간 초과 */
export const isCorrect = (q: Question, side: 0 | 1 | null): boolean => side !== null && q.options[side] === q.answer;

/** 오답노트 갱신. 원본은 건드리지 않고 새 객체를 돌려준다 */
export function updateWrongNote(note: WrongNote, vi: string, correct: boolean, clearAt: number = CONFIG.quiz.reviewClearAt): WrongNote {
  const next = { ...note };
  if (!correct) next[vi] = 1;
  else if (next[vi]) {
    next[vi]++;
    if (next[vi] >= clearAt) delete next[vi];
  }
  return next;
}

/** 퀴즈 한 문제의 결과로 고블린에게 일어나는 일 */
export type QuizOutcome =
  | { kind: 'next'; remaining: number } // 대장: 한 문제 더
  | { kind: 'kill' } // 처치
  | { kind: 'recover'; hp: number; remaining: number }; // 오답: HP 회복 후 전투 재개, 필요 문제 수 초기화

/**
 * remaining: 이번 문제를 풀기 전 남은 문제 수 (일반 1, 대장 처음엔 2)
 * quizCount: 이 적의 원래 필요 문제 수 (오답이면 처음부터 다시)
 */
export function resolveQuiz(remaining: number, correct: boolean, maxHp: number, quizCount: number): QuizOutcome {
  if (!correct) return { kind: 'recover', hp: recoverHp(maxHp), remaining: quizCount };
  const left = remaining - 1;
  return left > 0 ? { kind: 'next', remaining: left } : { kind: 'kill' };
}
