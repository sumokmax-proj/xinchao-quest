import { describe, expect, it } from 'vitest';
import { pitchFactor } from '../src/audio/Sfx';
import { telegraphDone, type TelegraphState } from '../src/combat/Telegraph';
import { CONFIG } from '../src/config';
import { FX_LIST, fxOn, sanitizeFxOff, setAllFx, toggleFx } from '../src/core/Fx';
import { clearProgress, defaultSave, parseSave } from '../src/core/Save';
import { TimeFx } from '../src/core/TimeFx';

/** 예고가 끝날 때까지 걸리는 실제 시간. 게임처럼 몬스터에게는 world 시간을 준다 */
function realTimeToStrike(duration: number, fx: TimeFx, dt: number): number {
  const tele: TelegraphState = { cells: [], elapsed: 0, duration };
  let real = 0;
  while (!telegraphDone(tele)) {
    tele.elapsed += fx.step(dt).world;
    real += dt;
  }
  return real;
}

describe('게임 시간과 연출 시간 구분 (TimeFx)', () => {
  const dt = 1 / 60;

  it('아무 연출이 없으면 world와 anim은 실제 시간 그대로', () => {
    expect(new TimeFx().step(dt)).toEqual({ world: dt, anim: dt });
  });

  it('히트스톱은 보이는 동작만 거의 멈추고, 판단·예고 시간은 그대로', () => {
    const fx = new TimeFx();
    fx.hitStop(0.1);
    const s = fx.step(dt);
    expect(s.world).toBe(dt);
    expect(s.anim).toBeLessThan(dt * 0.1);
  });

  it('때릴 때마다 히트스톱이 걸려도 빨간 예고는 늦어지지 않는다', () => {
    const fx = new TimeFx();
    const tele: TelegraphState = { cells: [], elapsed: 0, duration: CONFIG.enemies.goblin.telegraph };
    let real = 0;
    let frame = 0;
    while (!telegraphDone(tele)) {
      if (frame++ % 20 === 0) fx.hitStop(CONFIG.feel.hitStopCrit);
      tele.elapsed += fx.step(dt).world;
      real += dt;
    }
    expect(real).toBeCloseTo(CONFIG.enemies.goblin.telegraph, 1);
  });

  it('슬로 모션은 정해진 실제 시간 동안만 0.25배 → 예고는 딱 그만큼만 늦어진다', () => {
    const fx = new TimeFx();
    const { slowMoTime, slowMoScale } = CONFIG.feel;
    fx.slowMo(slowMoTime, slowMoScale);
    const real = realTimeToStrike(0.78, fx, dt);
    expect(real).toBeCloseTo(0.78 + slowMoTime * (1 - slowMoScale), 1);
  });

  it('프레임 속도가 달라도 슬로 모션 동안 흐른 게임 시간은 같다', () => {
    const run = (step: number) => {
      const fx = new TimeFx();
      fx.slowMo(0.45, 0.25);
      let world = 0;
      const frames = Math.round(1.2 / step);
      for (let i = 0; i < frames; i++) world += fx.step(step).world;
      return world;
    };
    expect(run(1 / 30)).toBeCloseTo(1.2 - 0.45 * 0.75, 5);
    expect(run(1 / 120)).toBeCloseTo(1.2 - 0.45 * 0.75, 5);
  });

  it('새 퀴즈가 뜨면 슬로 모션을 바로 끝낼 수 있다', () => {
    const fx = new TimeFx();
    fx.slowMo(1, 0.25);
    fx.cancelSlowMo();
    expect(fx.slowing).toBe(false);
    expect(fx.step(dt).world).toBe(dt);
  });
});

describe('연출 스위치', () => {
  it('처음에는 전부 켜짐, 하나씩 끄고 켤 수 있다', () => {
    expect(FX_LIST.every((f) => fxOn(defaultSave().fxOff, f.id))).toBe(true);
    const off = toggleFx([], 'shake');
    expect(fxOn(off, 'shake')).toBe(false);
    expect(fxOn(off, 'sparks')).toBe(true);
    expect(toggleFx(off, 'shake')).toEqual([]);
  });

  it('전부 끄기 / 전부 켜기', () => {
    expect(setAllFx(false)).toHaveLength(FX_LIST.length);
    expect(setAllFx(true)).toEqual([]);
  });

  it('저장에서 읽을 때 모르는 이름·중복은 버린다', () => {
    expect(sanitizeFxOff(['shake', 'shake', 'laser', 3])).toEqual(['shake']);
    expect(sanitizeFxOff('shake')).toEqual([]);
    expect(parseSave(JSON.stringify({ fxOff: ['zoom'], devOpen: true }))).toMatchObject({ fxOff: ['zoom'], devOpen: true });
  });

  it('진행을 초기화해도 연출 설정은 남는다', () => {
    const s = clearProgress({ ...defaultSave(), fxOff: ['vibrate'], devOpen: true });
    expect(s.fxOff).toEqual(['vibrate']);
    expect(s.devOpen).toBe(true);
  });
});

describe('타격 연출 수치', () => {
  it('일반 타격은 화면을 흔들지 않고, 센 공격만 흔든다', () => {
    const f = CONFIG.feel;
    expect(f.shakeHit).toBe(0);
    for (const v of [f.shakeCrit, f.shakeKill, f.shakeHurt, f.shakeBossKill, f.shakeBossAttack]) expect(v).toBeGreaterThan(0);
  });

  it('효과음 높낮이는 ±5% 안에서 바뀐다', () => {
    expect(pitchFactor(0, 0.05)).toBeCloseTo(0.95);
    expect(pitchFactor(0.5, 0.05)).toBeCloseTo(1);
    expect(pitchFactor(1, 0.05)).toBeCloseTo(1.05);
    expect(pitchFactor(0.9, 0)).toBe(1);
  });
});
