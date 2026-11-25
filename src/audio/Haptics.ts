/** 짧은 진동. 지원하지 않는 기기(아이폰 사파리 등)에서는 아무 일도 하지 않는다 */
export const canVibrate = (): boolean => typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

export function vibrate(pattern: readonly number[]): void {
  if (!canVibrate()) return;
  try {
    navigator.vibrate([...pattern]);
  } catch {
    /* 무시 */
  }
}
