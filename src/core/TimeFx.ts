/**
 * "게임 시간"과 "연출 시간"을 나누는 곳 (순수 로직).
 *
 * 한 프레임의 실제 시간(dt)은 세 가지로 쓰인다.
 * - 그대로(dt): 플레이어 이동·공격 간격, 퀴즈 제한시간, "몇 초 뒤" 타이머 → 연출이 절대 바꾸지 않는다
 * - world: 몬스터의 생각과 빨간 예고. 슬로 모션 때만 느려진다 (보이는 것과 맞는 시점이 같이 느려짐)
 * - anim: 동작·파편 같은 보이는 것. world에서 히트스톱 동안 거의 멈춘다 (예고 시간은 안 바뀜)
 */
const HIT_STOP_SCALE = 0.06;

export class TimeFx {
  private stopLeft = 0;
  private slowLeft = 0;
  private slowScale = 1;

  get slowing(): boolean {
    return this.slowLeft > 0;
  }

  hitStop(seconds: number): void {
    this.stopLeft = Math.max(this.stopLeft, seconds);
  }

  slowMo(seconds: number, scale: number): void {
    this.slowLeft = Math.max(this.slowLeft, seconds);
    this.slowScale = scale;
  }

  cancelSlowMo(): void {
    this.slowLeft = 0;
  }

  reset(): void {
    this.stopLeft = 0;
    this.slowLeft = 0;
  }

  step(dt: number): { world: number; anim: number } {
    // 프레임 중간에 끝나면 남은 만큼만 느리게 (프레임 속도가 달라도 같은 결과)
    const slowPart = Math.min(dt, Math.max(0, this.slowLeft));
    const world = slowPart * this.slowScale + (dt - slowPart);
    const stopPart = dt > 0 ? Math.min(dt, Math.max(0, this.stopLeft)) / dt : 0;
    const anim = world * (stopPart * HIT_STOP_SCALE + (1 - stopPart));
    this.slowLeft -= dt;
    this.stopLeft -= dt;
    return { world, anim };
  }
}
