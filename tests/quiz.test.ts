import { describe, expect, it } from 'vitest';
import words from '../src/data/words.json';
import { isCorrect, makeQuestion, resolveQuiz, toneBase, toneSiblings, updateWrongNote, type Word } from '../src/combat/QuizSystem';
import { seq } from './helpers';

const W: Word[] = [
  { vi: 'xin chào', ko: '안녕하세요' },
  { vi: 'cảm ơn', ko: '감사합니다' },
  { vi: 'tôi', ko: '나, 저' },
];

describe('문제 만들기', () => {
  it('정답이 보기 두 개 중 하나에 꼭 있고, 두 보기는 다름', () => {
    for (let i = 0; i < 200; i++) {
      const q = makeQuestion(words, {}, Math.random);
      expect(q.options).toContain(q.answer);
      expect(q.options[0]).not.toBe(q.options[1]);
    }
  });
  it('베트남어 → 뜻 문제', () => {
    // 단어 0번, 다른 단어 1번, 방향 0.3(<0.5 → 베트남어 보고 뜻), 섞기 0.9(그대로)
    const q = makeQuestion(W, {}, seq(0, 0.4, 0.3, 0.9));
    expect(q.prompt).toBe('xin chào');
    expect(q.kindLabel).toBe('무슨 뜻?');
    expect(q.answer).toBe('안녕하세요');
  });
  it('한국어 → 베트남어 문제', () => {
    const q = makeQuestion(W, {}, seq(0, 0.4, 0.7, 0.9));
    expect(q.prompt).toBe('안녕하세요');
    expect(q.kindLabel).toBe('베트남어로?');
    expect(q.answer).toBe('xin chào');
  });
  it('오답노트 단어는 40% 확률로 먼저 나옴', () => {
    const q = makeQuestion(W, { tôi: 1 }, seq(0.1, 0, 0, 0.3, 0.9));
    expect(q.word.vi).toBe('tôi');
  });
  it('단어가 2개 미만이면 에러', () => {
    expect(() => makeQuestion([W[0]], {}, Math.random)).toThrow();
  });
  it('words.json: 모든 단어에 vi, ko가 있고 베트남어가 겹치지 않음', () => {
    expect(words.length).toBeGreaterThanOrEqual(2);
    words.forEach((w) => {
      expect(w.vi.trim()).not.toBe('');
      expect(w.ko.trim()).not.toBe('');
    });
    expect(new Set(words.map((w) => w.vi)).size).toBe(words.length);
  });
  it('words.json: 뜻(한국어)도 겹치지 않음 (겹치면 2지선다 보기가 같아질 수 있음)', () => {
    expect(new Set(words.map((w) => w.ko)).size).toBe(words.length);
  });
  it('words.json: 단어 50개 이상', () => {
    expect(words.length).toBeGreaterThanOrEqual(50);
  });
});

describe('성조 구별 문제', () => {
  const T: Word[] = [
    { vi: 'bạn', ko: '친구' },
    { vi: 'bán', ko: '팔다' },
    { vi: 'bàn', ko: '테이블' },
    { vi: 'nhà', ko: '집' },
  ];
  it('성조·모음 부호를 떼면 같은 글자', () => {
    expect(toneBase('bạn')).toBe('ban');
    expect(toneBase('mưa')).toBe('mua');
    expect(toneBase('chợ')).toBe(toneBase('chờ'));
    expect(toneBase('đi')).toBe('di');
    expect(toneBase('Bánh Mì')).toBe('banh mi');
  });
  it('짝 찾기: 자기 자신은 빼고, 부호만 다른 단어만', () => {
    expect(toneSiblings(T, T[0]).map((w) => w.vi)).toEqual(['bán', 'bàn']);
    expect(toneSiblings(T, T[3])).toEqual([]);
  });
  it('짝이 있고 확률에 걸리면 성조 문제: 한국어 뜻을 보고 성조만 다른 두 단어 중 고르기', () => {
    // 단어 0번(bạn), 성조 확률 0.1(<0.4 → 성조 문제), 짝 0번(bán), 섞기 0.9(그대로)
    const q = makeQuestion(T, {}, seq(0, 0.1, 0, 0.9));
    expect(q.kind).toBe('tone');
    expect(q.prompt).toBe('친구');
    expect(q.answer).toBe('bạn');
    expect(q.options).toContain('bán');
    expect(q.options).toContain('bạn');
  });
  it('확률에 안 걸리면 보통 문제', () => {
    const q = makeQuestion(T, {}, seq(0, 0.9, 0.5, 0.3, 0.9));
    expect(q.kind).toBe('normal');
  });
  it('짝이 없는 단어는 언제나 보통 문제', () => {
    for (let i = 0; i < 50; i++) expect(makeQuestion(W, {}, Math.random).kind).toBe('normal');
  });
  it('words.json에 성조 짝이 5쌍 이상', () => {
    const bases = new Map<string, number>();
    words.forEach((w) => bases.set(toneBase(w.vi), (bases.get(toneBase(w.vi)) ?? 0) + 1));
    expect([...bases.values()].filter((n) => n >= 2).length).toBeGreaterThanOrEqual(5);
  });
  it('실제 단어로 많이 만들어도 정답은 보기에 있고 두 보기는 다름', () => {
    for (let i = 0; i < 500; i++) {
      const q = makeQuestion(words, {}, Math.random);
      expect(q.options).toContain(q.answer);
      expect(q.options[0]).not.toBe(q.options[1]);
    }
  });
});

describe('정답 판정', () => {
  const q = makeQuestion(W, {}, seq(0, 0.4, 0.3, 0.9));
  const right = q.options.indexOf(q.answer) as 0 | 1;
  it('정답 쪽을 고르면 정답', () => expect(isCorrect(q, right)).toBe(true));
  it('반대쪽은 오답', () => expect(isCorrect(q, (1 - right) as 0 | 1)).toBe(false));
  it('시간 초과는 오답', () => expect(isCorrect(q, null)).toBe(false));
});

describe('퀴즈 결과', () => {
  it('일반 고블린: 정답 1번이면 처치', () => {
    expect(resolveQuiz(1, true, 30, 1)).toEqual({ kind: 'kill' });
  });
  it('대장: 첫 정답이면 한 문제 더, 두 번째 정답이면 처치', () => {
    expect(resolveQuiz(2, true, 70, 2)).toEqual({ kind: 'next', remaining: 1 });
    expect(resolveQuiz(1, true, 70, 2)).toEqual({ kind: 'kill' });
  });
  it('오답: HP 15% 회복, 대장은 다시 2문제', () => {
    expect(resolveQuiz(1, false, 30, 1)).toEqual({ kind: 'recover', hp: 5, remaining: 1 });
    expect(resolveQuiz(1, false, 70, 2)).toEqual({ kind: 'recover', hp: 11, remaining: 2 });
  });
});

describe('오답노트', () => {
  it('틀리면 1점으로 들어감', () => {
    expect(updateWrongNote({}, 'tôi', false)).toEqual({ tôi: 1 });
  });
  it('두 번 맞히면 빠짐 (1 → 2 → 3에서 삭제)', () => {
    const a = updateWrongNote({ tôi: 1 }, 'tôi', true);
    expect(a).toEqual({ tôi: 2 });
    expect(updateWrongNote(a, 'tôi', true)).toEqual({});
  });
  it('오답노트에 없던 단어를 맞히면 그대로', () => {
    expect(updateWrongNote({ tôi: 1 }, 'cảm ơn', true)).toEqual({ tôi: 1 });
  });
  it('원본은 바뀌지 않음', () => {
    const note = { tôi: 1 };
    updateWrongNote(note, 'tôi', true);
    expect(note).toEqual({ tôi: 1 });
  });
});
