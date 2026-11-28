import { pick, shuffle, type Rng } from './random';
import type { Cell } from '../world/Grid';

/**
 * 로그라이트 2단계: 판 보너스 (순수 로직).
 * 웨이브를 깰 때마다 바닥에 물건 2개가 떨어지고, 걸어가서 하나를 주우면 그 판(스테이지) 동안만 효과가 있다.
 * 판이 끝나거나 쓰러지면 사라진다. 돈으로 살 수 없고 웨이브를 깨야만 나온다 (결정 #15).
 */

export type BonusEffect = 'attack' | 'crit' | 'guard' | 'heal' | 'gold' | 'quizTime' | 'charm' | 'review';

/** src/data/bonuses.json 한 줄 */
export interface BonusDef {
  id: string;
  name: string;
  short: string; // 효과 한 줄 (물건 위 이름표, HUD 칩)
  effect: BonusEffect;
  value: number;
  color: string;
  learn: boolean; // 학습 보조 (퀴즈를 돕는 물건)
  repeat?: boolean; // 한 판에 여러 번 주울 수 있음 (회복)
}

/** 이번 판에 주운 보너스를 합친 효과 */
export interface RunEffects {
  attack: number; // 공격력 +비율
  crit: number; // 크리티컬 확률 +
  guard: number; // 받는 피해 감소 비율
  gold: number; // 처치 골드 +비율
  quizTime: number; // 퀴즈 제한시간 +초
  charms: number; // 오답 보호 횟수
  review: number; // 오답노트 단어를 맞히면 받는 골드 (0이면 효과 없음)
}

export const noEffects = (): RunEffects => ({ attack: 0, crit: 0, guard: 0, gold: 0, quizTime: 0, charms: 0, review: 0 });

/** 주운 보너스 id 목록 → 효과 합계 (회복은 주울 때 바로 쓰므로 여기서는 빠짐) */
export function runEffects(defs: readonly BonusDef[], taken: readonly string[]): RunEffects {
  const fx = noEffects();
  for (const id of taken) {
    const d = defs.find((x) => x.id === id);
    if (!d) continue;
    switch (d.effect) {
      case 'attack':
        fx.attack += d.value;
        break;
      case 'crit':
        fx.crit += d.value;
        break;
      case 'guard':
        fx.guard = combineGuard(fx.guard, d.value);
        break;
      case 'gold':
        fx.gold += d.value;
        break;
      case 'quizTime':
        fx.quizTime += d.value;
        break;
      case 'charm':
        fx.charms += d.value;
        break;
      case 'review':
        fx.review = Math.max(fx.review, d.value);
        break;
      case 'heal':
        break;
    }
  }
  return fx;
}

/** 피해 감소 두 개 겹치기: 20%와 20%는 40%가 아니라 36% (절대 100%가 되지 않음) */
export const combineGuard = (a: number, b: number): number => 1 - (1 - a) * (1 - b);

/** 이번 판 퀴즈가 어려운가: 2문제 이상 풀었고 틀린 비율이 limit 이상 */
export const isStruggling = (correct: number, total: number, limit: number): boolean => total >= 2 && (total - correct) / total >= limit;

export interface OfferContext {
  taken: readonly string[]; // 이번 판에 이미 주운 것
  struggling: boolean; // 퀴즈가 어려우면 학습 보조 물건을 꼭 하나
  hasReview: boolean; // 오답노트에 단어가 있나 (없으면 복습 두루마리는 쓸모없음)
  hurt: boolean; // HP가 깎였나 (가득이면 회복은 쓸모없음)
}

/** 바닥에 떨어뜨릴 물건 2개 (서로 다름). 고를 수 있는 게 하나뿐이면 1개 */
export function offerBonuses(defs: readonly BonusDef[], ctx: OfferContext, rng: Rng, count = 2): BonusDef[] {
  const usable = defs.filter(
    (d) => (d.repeat || !ctx.taken.includes(d.id)) && (d.effect !== 'review' || ctx.hasReview) && (d.effect !== 'heal' || ctx.hurt),
  );
  const pool = shuffle(rng, usable);
  const out: BonusDef[] = [];
  if (ctx.struggling) {
    const learn = pool.filter((d) => d.learn);
    if (learn.length) out.push(pick(rng, learn));
  }
  for (const d of pool) {
    if (out.length >= count) break;
    if (!out.includes(d)) out.push(d);
  }
  return shuffle(rng, out);
}

/**
 * 물건을 놓을 칸 2개: 플레이어 양옆(좌우 2칸)을 먼저, 막혀 있으면 가까운 빈 칸.
 * 서로 붙어 있지 않게(2칸 이상 떨어지게) 고른다. isFree는 걸을 수 있고 비어 있는 칸인지.
 */
export function pickupCells(player: Cell, isFree: (c: number, r: number) => boolean, count = 2, maxDist = 5): Cell[] {
  const preferred: Cell[] = [
    { c: player.c - 2, r: player.r },
    { c: player.c + 2, r: player.r },
    { c: player.c, r: player.r - 2 },
    { c: player.c, r: player.r + 2 },
  ];
  const ring: Cell[] = [];
  for (let d = 1; d <= maxDist; d++) {
    for (let dc = -d; dc <= d; dc++) {
      const rest = d - Math.abs(dc);
      for (const dr of rest === 0 ? [0] : [-rest, rest]) ring.push({ c: player.c + dc, r: player.r + dr });
    }
  }
  const out: Cell[] = [];
  const far = (a: Cell) => out.every((b) => Math.abs(a.c - b.c) + Math.abs(a.r - b.r) >= 2);
  for (const cell of [...preferred, ...ring]) {
    if (out.length >= count) break;
    if (cell.c === player.c && cell.r === player.r) continue;
    if (isFree(cell.c, cell.r) && far(cell)) out.push(cell);
  }
  return out;
}
