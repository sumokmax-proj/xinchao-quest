import type { Rng } from '../src/core/random';

/** 정해 둔 숫자를 차례대로 돌려주는 가짜 난수 (다 쓰면 처음부터 반복) */
export function seq(...values: number[]): Rng {
  let i = 0;
  return () => values[i++ % values.length];
}
