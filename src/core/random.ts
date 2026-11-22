/** 0 이상 1 미만의 수를 돌려주는 함수. 테스트에서는 정해진 값을 돌려주는 가짜로 바꿔 넣는다. */
export type Rng = () => number;

export const defaultRng: Rng = Math.random;

/** a 이상 b 미만의 무작위 수 */
export const rand = (rng: Rng, a: number, b: number): number => a + rng() * (b - a);

/** 배열에서 하나를 무작위로 */
export function pick<T>(rng: Rng, list: readonly T[]): T {
  if (list.length === 0) throw new Error('pick: 빈 배열');
  return list[Math.floor(rng() * list.length)];
}

/** 원본은 그대로 두고 섞은 새 배열을 돌려준다 */
export function shuffle<T>(rng: Rng, list: readonly T[]): T[] {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
