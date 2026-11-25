import type { Rng } from './random';
import type { WaveData } from './Waves';

/** 스테이지 하나 (src/data/stages.json) */
export interface StageData {
  id: string;
  name: string;
  map: string; // src/data/maps/<map>.json
  /** 이 스테이지에서 주로 나오는 단어 주제. 비어 있으면 모든 주제 */
  topics: string[];
  /** 적 HP·보상 배율 (1 = 기본) */
  power: number;
  /** 적 공격 피해 배율 (1 = 기본) */
  damage: number;
  waves: WaveData[];
}

/** 스테이지별 기록 (저장됨) */
export interface StageRecord {
  clears: number;
  best: number; // 가장 빠른 클리어 시간(초). 0이면 기록 없음
  stars: number; // 가장 좋았던 별 (0~3). 별은 퀴즈 정답률로 받는다
}

/** 이번 판의 별: 졌으면 0, 클리어 1, 정답률 two 이상 2, three 이상 3 */
export function starsFor(win: boolean, correct: number, total: number, rule: { two: number; three: number }): number {
  if (!win) return 0;
  const acc = total > 0 ? correct / total : 0;
  return acc >= rule.three ? 3 : acc >= rule.two ? 2 : 1;
}
export type StageRecords = Record<string, StageRecord>;

/** 첫 스테이지는 처음부터, 나머지는 바로 앞 스테이지를 한 번이라도 깨면 열린다 */
export function isUnlocked(stages: readonly StageData[], records: StageRecords, index: number): boolean {
  if (index <= 0) return true;
  if (index >= stages.length) return false;
  return (records[stages[index - 1].id]?.clears ?? 0) > 0;
}

/** 열린 스테이지 중 가장 뒤 (시작 화면에서 바로 이어 하기용) */
export function lastUnlocked(stages: readonly StageData[], records: StageRecords): number {
  let i = 0;
  while (i + 1 < stages.length && isUnlocked(stages, records, i + 1)) i++;
  return i;
}

/** 클리어 기록 갱신 (원본은 그대로) */
export function recordClear(records: StageRecords, id: string, seconds: number, stars = 1): StageRecords {
  const prev = records[id] ?? { clears: 0, best: 0, stars: 0 };
  const best = prev.best === 0 ? seconds : Math.min(prev.best, seconds);
  return { ...records, [id]: { clears: prev.clears + 1, best, stars: Math.max(prev.stars, stars) } };
}

interface TopicWord {
  topic?: string;
}

/**
 * 스테이지에서 낼 단어 묶음.
 * main: 이 스테이지 주제 단어 / older: 앞 스테이지들 주제 단어 (복습용)
 * 주제가 비어 있는 스테이지(마지막)는 모든 단어가 main.
 */
export function stageWords<W extends TopicWord>(words: readonly W[], stages: readonly StageData[], index: number): { main: W[]; older: W[] } {
  const st = stages[index];
  if (!st.topics.length) return { main: words.slice(), older: [] };
  const main = words.filter((w) => w.topic !== undefined && st.topics.includes(w.topic));
  const olderTopics = new Set(stages.slice(0, index).flatMap((s) => s.topics));
  const older = words.filter((w) => w.topic !== undefined && olderTopics.has(w.topic) && !st.topics.includes(w.topic));
  return { main, older };
}

/** 이번 문제를 어느 묶음에서 낼지: olderChance 확률로 앞 스테이지 단어까지 섞은 묶음 */
export function pickPool<W>(pools: { main: W[]; older: W[] }, rng: Rng, olderChance: number): W[] {
  if (pools.older.length && rng() < olderChance) return [...pools.main, ...pools.older];
  return pools.main;
}

/**
 * 적 능력치에 스테이지 배율 적용 (반올림).
 * EXP는 배율의 제곱근만큼만 늘린다 (그대로 곱하면 레벨이 배율보다 빨리 올라 뒤 스테이지가 오히려 쉬워짐)
 */
export function scaleEnemy<T extends { hp: number; damage: number; exp: number; gold: number }>(stats: T, power: number, damage: number = power): T {
  return {
    ...stats,
    hp: Math.round(stats.hp * power),
    damage: Math.round(stats.damage * damage),
    exp: Math.round(stats.exp * Math.sqrt(power)),
    gold: Math.round((stats.gold * power) / 500) * 500, // 동(đồng)은 500 단위로
  } as T;
}

/** 저장소 값 검사 */
export function sanitizeStageRecords(raw: unknown): StageRecords {
  const out: StageRecords = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!v || typeof v !== 'object') continue;
    const r = v as Record<string, unknown>;
    const n = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? Math.floor(x) : 0);
    // 별이 생기기 전에 깬 저장은 별 하나로
    out[id] = { clears: n(r.clears), best: n(r.best), stars: Math.min(3, Math.max(n(r.stars), n(r.clears) > 0 ? 1 : 0)) };
  }
  return out;
}
