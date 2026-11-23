import { describe, expect, it } from 'vitest';
import { Timers } from '../src/core/Timers';
import { WaveProgress } from '../src/core/Waves';

describe('웨이브 진행', () => {
  it('적이 남아 있으면 아무 일 없음', () => {
    expect(new WaveProgress(3).check(2)).toBeNull();
  });
  it('다 잡으면 다음 웨이브를 딱 한 번만 알림', () => {
    const w = new WaveProgress(3);
    expect(w.check(0)).toEqual({ kind: 'next', index: 1 });
    expect(w.check(0)).toBeNull();
    w.advance();
    expect(w.index).toBe(1);
    expect(w.check(0)).toEqual({ kind: 'next', index: 2 });
  });
  it('마지막 웨이브를 다 잡으면 클리어', () => {
    const w = new WaveProgress(3);
    w.check(0); w.advance();
    w.check(0); w.advance();
    expect(w.check(0)).toEqual({ kind: 'clear' });
  });
  it('reset하면 처음부터', () => {
    const w = new WaveProgress(2);
    w.check(0); w.advance();
    w.reset();
    expect(w.index).toBe(0);
    expect(w.check(0)).toEqual({ kind: 'next', index: 1 });
  });
});

describe('Timers', () => {
  it('정해진 시간이 지나면 한 번 실행', () => {
    const t = new Timers();
    let n = 0;
    t.after(1.1, () => n++);
    t.update(1);
    expect(n).toBe(0);
    t.update(0.2);
    expect(n).toBe(1);
    t.update(5);
    expect(n).toBe(1);
  });
  it('실행 중에 새 타이머를 걸어도 다음 update에서 처리', () => {
    const t = new Timers();
    const log: string[] = [];
    t.after(0.1, () => { log.push('a'); t.after(0.1, () => log.push('b')); });
    t.update(0.2);
    t.update(0.2);
    expect(log).toEqual(['a', 'b']);
  });
});
