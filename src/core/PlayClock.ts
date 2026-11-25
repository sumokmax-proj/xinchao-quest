/**
 * 실제로 논 시간 재기 (순수 로직). 매 프레임 tick을 부른다.
 * 쉬는 동안(설정 창, 시작 화면, 가로 화면 안내)은 안 센다.
 * 탭을 내려 두면 프레임이 멈췄다가 한참 뒤에 오므로, 한 번에 maxGap(초)까지만 더한다.
 */
export class PlayClock {
  private last: number | null = null;
  private pending = 0;

  constructor(private readonly maxGap = 0.5) {}

  /** nowMs: 지금 시각(ms). 돌려주는 값: 이번에 더해진 시간(초) */
  tick(nowMs: number, active: boolean): number {
    const gap = this.last === null ? 0 : Math.max(0, (nowMs - this.last) / 1000);
    this.last = nowMs;
    if (!active) return 0;
    const add = Math.min(gap, this.maxGap);
    this.pending += add;
    return add;
  }

  /** 꽉 찬 초만 꺼내 간다 (저장 기록은 정수 초) */
  takeWholeSeconds(): number {
    const whole = Math.floor(this.pending);
    this.pending -= whole;
    return whole;
  }
}
