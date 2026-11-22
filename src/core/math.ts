export const clamp01 = (t: number): number => Math.max(0, Math.min(1, t));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * clamp01(t);
export const easeInOut = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
export const easeOut = (t: number): number => 1 - Math.pow(1 - t, 3);

/** 각도 a에서 b로 가장 짧은 방향으로 t만큼 돌린다 */
export function lerpAngle(a: number, b: number, t: number): number {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
