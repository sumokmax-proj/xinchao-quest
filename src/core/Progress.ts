import { CONFIG } from '../config';
import type { HeroStats } from '../combat/rules';

/**
 * 판이 끝나도 남는 진행 기록. 전부 순수 함수로 다룬다 (three·DOM 없음 → 단위 테스트 가능).
 * 원본 객체는 바꾸지 않고 새 객체를 돌려준다.
 */

/** 검사의 누적 성장과 기록 */
export interface Profile {
  level: number;
  exp: number;
  gold: number;
  kills: number; // 지금까지 처치한 적
  correct: number; // 지금까지 맞힌 문제
  answered: number; // 지금까지 푼 문제 (시간 초과 포함)
  runs: number; // 시작한 판 수
  clears: number; // 클리어한 판 수
}

/** 단어 하나의 학습 기록 (단어 도감). 처음 맞힌 순간 도감에 들어간다 */
export interface DexEntry {
  right: number;
  wrong: number;
  first: number; // 처음 맞힌 시각 (Date.now() 값). 0이면 아직 못 맞힘
}

export type Dex = Record<string, DexEntry>;

export const freshProfile = (): Profile => ({ level: 1, exp: 0, gold: 0, kills: 0, correct: 0, answered: 0, runs: 0, clears: 0 });

/** 레벨에서 공격력·최대 HP를 계산한다. 판을 시작할 때 HP는 가득 */
export function heroStatsFor(level: number, exp: number, p = CONFIG.player, l = CONFIG.level): HeroStats {
  const maxHp = p.maxHp + (level - 1) * l.maxHpPerLevel;
  return { level, exp, attack: p.attack + (level - 1) * l.attackPerLevel, hp: maxHp, maxHp };
}

/** 도감에 들어 있나 (한 번이라도 맞혔나) */
export const isCollected = (dex: Dex, vi: string): boolean => (dex[vi]?.first ?? 0) > 0;

/** 문제 하나를 풀었을 때 도감 기록. newlyLearned: 이번에 처음 맞혀서 도감에 들어갔나 */
export function recordAnswer(dex: Dex, vi: string, correct: boolean, now: number): { dex: Dex; newlyLearned: boolean } {
  const prev = dex[vi] ?? { right: 0, wrong: 0, first: 0 };
  const newlyLearned = correct && prev.first === 0;
  const entry: DexEntry = {
    right: prev.right + (correct ? 1 : 0),
    wrong: prev.wrong + (correct ? 0 : 1),
    first: newlyLearned ? now : prev.first,
  };
  return { dex: { ...dex, [vi]: entry }, newlyLearned };
}

/** 도감 진행률: 전체 단어 중 몇 개를 모았나 */
export function dexProgress(dex: Dex, allWords: readonly { vi: string }[]): { collected: number; total: number } {
  const collected = allWords.filter((w) => isCollected(dex, w.vi)).length;
  return { collected, total: allWords.length };
}

const num = (v: unknown, min: number, def: number): number => (typeof v === 'number' && Number.isFinite(v) && v >= min ? Math.floor(v) : def);

/** 저장소에서 읽은 값이 깨져 있어도 안전한 Profile로 고친다 */
export function sanitizeProfile(raw: unknown): Profile {
  const d = freshProfile();
  if (!raw || typeof raw !== 'object') return d;
  const r = raw as Record<string, unknown>;
  return {
    level: num(r.level, 1, d.level),
    exp: num(r.exp, 0, d.exp),
    gold: num(r.gold, 0, d.gold),
    kills: num(r.kills, 0, d.kills),
    correct: num(r.correct, 0, d.correct),
    answered: num(r.answered, 0, d.answered),
    runs: num(r.runs, 0, d.runs),
    clears: num(r.clears, 0, d.clears),
  };
}

export function sanitizeDex(raw: unknown): Dex {
  const out: Dex = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [vi, e] of Object.entries(raw as Record<string, unknown>)) {
    if (!e || typeof e !== 'object') continue;
    const r = e as Record<string, unknown>;
    out[vi] = { right: num(r.right, 0, 0), wrong: num(r.wrong, 0, 0), first: num(r.first, 0, 0) };
  }
  return out;
}
