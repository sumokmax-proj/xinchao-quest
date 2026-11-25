import { describe, expect, it } from 'vitest';
import { PlayClock } from '../src/core/PlayClock';

/** from ~ to(ms)를 16ms 프레임으로 돌린다 */
function run(c: PlayClock, from: number, to: number, active = true): number {
  let sum = 0;
  for (let t = from; t <= to; t += 16) sum += c.tick(t, active);
  return sum;
}

describe('실제로 논 시간', () => {
  it('프레임마다 흐른 시간을 더한다', () => {
    expect(run(new PlayClock(), 0, 10000)).toBeCloseTo(10, 1);
  });

  it('쉬는 동안(설정 창 등)은 안 센다. 다시 시작해도 쉰 시간이 한꺼번에 들어오지 않는다', () => {
    const c = new PlayClock();
    let sum = run(c, 0, 5000);
    sum += run(c, 5016, 65000, false);
    sum += run(c, 65016, 70000);
    expect(sum).toBeCloseTo(10, 1);
  });

  it('탭을 한 시간 내려 뒀다 돌아와도 조금만 더한다', () => {
    const c = new PlayClock(0.5);
    c.tick(0, true);
    expect(c.tick(3_600_000, true)).toBe(0.5);
  });

  it('저장은 꽉 찬 초만, 남은 것은 다음에', () => {
    const c = new PlayClock();
    run(c, 0, 2600);
    expect(c.takeWholeSeconds()).toBe(2);
    expect(c.takeWholeSeconds()).toBe(0);
    run(c, 2608, 3200);
    expect(c.takeWholeSeconds()).toBe(1);
  });
});
