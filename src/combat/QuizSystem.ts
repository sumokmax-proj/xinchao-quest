import { CONFIG } from '../config';
import { pick, shuffle, type Rng } from '../core/random';
import { recoverHp } from './rules';

export interface Word {
  vi: string;
  ko: string;
  topic?: string;
  status?: string; // "check": Claude 1차 검수에서 자신이 없어 사람 확인이 필요한 것 (note에 이유)
}

/** normal: 뜻 ↔ 베트남어 / tone: 성조만 다른 단어 중에서 뜻에 맞는 것 고르기 */
export type QuestionKind = 'normal' | 'tone';

export interface Question {
  word: Word;
  kind: QuestionKind;
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

/**
 * 성조·모음 부호를 뗀 기본 글자. bạn·bán·bàn → "ban", mua·mưa → "mua", chợ·chờ → "cho".
 * 이 값이 같은 단어끼리는 "소리가 비슷해서 헷갈리는 짝"이다.
 */
export function toneBase(vi: string): string {
  return vi
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

/** word와 기본 글자가 같은 다른 단어들 (성조 구별 문제의 오답 보기 후보) */
export function toneSiblings(words: readonly Word[], word: Word): Word[] {
  const base = toneBase(word.vi);
  return words.filter((w) => w !== word && w.vi !== word.vi && toneBase(w.vi) === base);
}

/**
 * 2지선다 문제 만들기. 40% 확률로 오답노트 단어를 먼저 낸다.
 * 고른 단어에 성조만 다른 짝이 있으면 toneChance 확률로 성조 구별 문제를 낸다.
 */
export function makeQuestion(
  words: readonly Word[],
  note: WrongNote,
  rng: Rng,
  reviewChance: number = CONFIG.quiz.reviewChance,
  toneChance: number = CONFIG.quiz.toneChance,
): Question {
  if (words.length < 2) throw new Error('퀴즈에는 단어가 2개 이상 필요');
  const wrongKeys = Object.keys(note);
  let word: Word | undefined;
  if (wrongKeys.length && rng() < reviewChance) {
    const key = pick(rng, wrongKeys);
    word = words.find((w) => w.vi === key);
  }
  if (!word) word = pick(rng, words);
  const siblings = toneSiblings(words, word);
  if (siblings.length && rng() < toneChance) {
    const sib = pick(rng, siblings);
    const [a, b] = shuffle(rng, [word.vi, sib.vi]);
    return { word, kind: 'tone', viToKo: false, prompt: word.ko, kindLabel: '성조 주의 · 베트남어로?', options: [a, b], answer: word.vi };
  }
  let other: Word;
  do other = pick(rng, words);
  while (other === word);
  const viToKo = rng() < 0.5;
  const [a, b] = shuffle(rng, viToKo ? [word.ko, other.ko] : [word.vi, other.vi]);
  return {
    word,
    kind: 'normal',
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
