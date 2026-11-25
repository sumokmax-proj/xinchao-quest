import { describe, expect, it } from 'vitest';
import { padDirection, swipeDirection, SwipeGesture } from '../src/core/touch';

describe('D-pad: 판 전체에서 방향 고르기', () => {
  it('가운데에서 벗어난 쪽이 방향', () => {
    expect(padDirection(60, 0, 14)).toBe('right');
    expect(padDirection(-60, 5, 14)).toBe('left');
    expect(padDirection(3, -60, 14)).toBe('up');
    expect(padDirection(0, 60, 14)).toBe('down');
  });

  it('모서리 빈칸을 눌러도 가까운 방향', () => {
    expect(padDirection(70, -40, 14)).toBe('right');
    expect(padDirection(-40, 70, 14)).toBe('down');
  });

  it('처음에 한가운데를 누르면 아무 방향도 아니고, 미끄러지다 가운데를 지나면 누르던 방향 유지', () => {
    expect(padDirection(4, 4, 14)).toBeNull();
    expect(padDirection(4, 4, 14, 'left')).toBe('left');
  });

  it('손가락을 미끄러뜨리면 방향이 바뀐다', () => {
    expect(padDirection(10, -60, 14, 'left', 12)).toBe('up');
  });

  it('대각선 경계에서 조금 흔들리는 것은 무시', () => {
    expect(padDirection(40, -45, 14, 'right', 12)).toBe('right');
    expect(padDirection(40, -60, 14, 'right', 12)).toBe('up');
    // 반대쪽으로 넘어가면 바로 바뀜
    expect(padDirection(-45, -40, 14, 'right', 12)).toBe('left');
  });
});

describe('스와이프', () => {
  it('짧게 움직인 것은 스와이프가 아님', () => {
    expect(swipeDirection(10, -8, 24)).toBeNull();
  });
  it('더 많이 움직인 축의 방향', () => {
    expect(swipeDirection(30, 10, 24)).toBe('right');
    expect(swipeDirection(-10, -30, 24)).toBe('up');
  });
});

describe('스와이프 동작 (대고 있으면 계속 걷기)', () => {
  const g = () => new SwipeGesture(24);

  it('밀면 출발하고, 손을 떼면 멈춘다', () => {
    const s = g();
    expect(s.down(100, 100, false)).toEqual([]);
    expect(s.move(140, 100, false)).toEqual([{ type: 'press', dir: 'right' }]);
    expect(s.move(180, 100, false)).toEqual([]);
    expect(s.up()).toEqual([{ type: 'release', dir: 'right' }]);
  });

  it('대고 있는 채 다시 밀면 방향이 바뀐다', () => {
    const s = g();
    s.down(100, 100, false);
    s.move(140, 100, false);
    expect(s.move(140, 60, false)).toEqual([
      { type: 'release', dir: 'right' },
      { type: 'press', dir: 'up' },
    ]);
  });

  it('걷던 중에 퀴즈가 뜨면, 그 손가락이 흘러가도 답으로 치지 않는다', () => {
    const s = g();
    s.down(100, 100, false);
    s.move(140, 100, false);
    // 퀴즈가 뜬 뒤
    expect(s.move(80, 100, true)).toEqual([]);
    expect(s.move(200, 100, true)).toEqual([]);
  });

  it('아직 밀기 전에 퀴즈가 뜬 터치도 답으로 치지 않는다', () => {
    const s = g();
    s.down(100, 100, false);
    expect(s.move(60, 100, true)).toEqual([]);
  });

  it('퀴즈 중에 새로 댄 손가락은 한 번 밀 때 답 하나', () => {
    const s = g();
    s.down(100, 100, true);
    expect(s.move(60, 100, true)).toEqual([
      { type: 'press', dir: 'left' },
      { type: 'release', dir: 'left' },
    ]);
    expect(s.move(150, 100, true)).toEqual([]);
    expect(s.up()).toEqual([]);
  });
});
