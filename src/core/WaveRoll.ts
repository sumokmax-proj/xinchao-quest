import type { EnemyKind } from '../config';
import { pick, shuffle, type Rng } from './random';
import type { WaveData } from './Waves';

/**
 * 로그라이트 1단계: 판마다 웨이브의 몬스터 구성을 조금씩 바꾼다 (순수 로직).
 *
 * 규칙
 * - 대장·보스(섞을 수 없는 몬스터)는 그대로 나온다.
 * - 웨이브에 있던 몬스터 종류는 한 마리씩 꼭 남긴다 ("원숭이가 나타났다" 웨이브에는 원숭이가 꼭 나옴).
 * - 나머지 몬스터는 "강함 점수"를 합친 만큼, 그 스테이지에 나오는 몬스터 중에서 무작위로 다시 채운다.
 *   점수 합계가 같으니 난이도는 비슷하고 조합만 바뀐다.
 * - 몬스터 수는 원래보다 최대 maxExtra마리까지만 많아진다 (화면이 너무 붐비지 않게).
 */

/** 몬스터별 강함 점수. 여기에 없는 몬스터(대장·보스·황금 고블린)는 섞지 않는다 */
export type EnemyCost = Partial<Record<EnemyKind, number>>;

/** 스테이지 전체 웨이브에서 섞을 수 있는 몬스터 종류 (나온 순서대로, 중복 없이) */
export function stageMix(waves: readonly WaveData[], cost: EnemyCost): EnemyKind[] {
  const out: EnemyKind[] = [];
  for (const w of waves) for (const k of w.enemies) if (cost[k] !== undefined && !out.includes(k)) out.push(k);
  return out;
}

/** 이번 판의 웨이브 몬스터 목록. 원본은 바꾸지 않는다 */
export function rollWave(enemies: readonly EnemyKind[], mix: readonly EnemyKind[], cost: EnemyCost, rng: Rng, maxExtra = 1): EnemyKind[] {
  const fixed: EnemyKind[] = [];
  const kept = new Set<EnemyKind>();
  let budget = 0;
  for (const k of enemies) {
    const c = cost[k];
    if (c === undefined || !mix.includes(k)) fixed.push(k);
    else if (!kept.has(k)) {
      kept.add(k);
      fixed.push(k);
    } else budget += c;
  }
  const maxCount = enemies.length + maxExtra;
  const rolled: EnemyKind[] = [];
  const eps = 1e-9;
  while (fixed.length + rolled.length < maxCount) {
    const fits = mix.filter((k) => (cost[k] ?? Infinity) <= budget + eps);
    if (!fits.length) break;
    const k = pick(rng, fits);
    rolled.push(k);
    budget -= cost[k] ?? 0;
  }
  // 점수가 남았는데 마릿수 한도에 걸렸으면: 남은 점수만큼 비싼 몬스터로 바꿔서 난이도가 줄지 않게
  for (let i = 0; i < rolled.length && budget > eps; i++) {
    const cur = cost[rolled[i]] ?? 0;
    const up = mix.filter((k) => (cost[k] ?? 0) > cur && (cost[k] ?? 0) - cur <= budget + eps);
    if (!up.length) continue;
    const k = pick(rng, up);
    budget -= (cost[k] ?? 0) - cur;
    rolled[i] = k;
  }
  // 섞은 몬스터가 앞에, 대장이 뒤에 오도록 (등장 순서가 원래와 비슷하게)
  const bosses = fixed.filter((k) => cost[k] === undefined || !mix.includes(k));
  const normals = shuffle(rng, [...fixed.filter((k) => !bosses.includes(k)), ...rolled]);
  return [...normals, ...bosses];
}

/** 몬스터 목록의 강함 점수 합 (섞지 않는 몬스터는 0). 테스트·점검용 */
export const waveCost = (enemies: readonly EnemyKind[], cost: EnemyCost): number => enemies.reduce((s, k) => s + (cost[k] ?? 0), 0);
