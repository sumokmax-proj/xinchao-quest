/** 효과음: WebAudio로 짧은 삑 소리를 만든다 (파일 없음) */
let actx: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(on: boolean): void {
  enabled = on;
}

/** 모바일 브라우저는 사용자가 한 번 터치해야 소리를 낼 수 있다 */
export function unlockAudio(): void {
  try {
    if (!actx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      actx = new Ctor();
    }
    if (actx.state === 'suspended') void actx.resume();
  } catch {
    /* 소리 없이 진행 */
  }
}

let pitchVary = 0;

/** 전투 효과음의 높낮이를 얼마나 흔들지 (0.05 = ±5%, 0 = 끔) */
export function setPitchVary(amount: number): void {
  pitchVary = amount;
}

/** r(0~1)로 정하는 높낮이 배율: 1 - amount ~ 1 + amount */
export const pitchFactor = (r: number, amount: number): number => 1 + (r * 2 - 1) * amount;

const vary = (): number => pitchFactor(Math.random(), pitchVary);

function tone(freqs: number[], dur = 0.07, type: OscillatorType = 'square', vol = 0.045, pitch = 1): void {
  if (!actx || !enabled) return;
  try {
    let t = actx.currentTime;
    for (const f of freqs) {
      const o = actx.createOscillator();
      const g = actx.createGain();
      o.type = type;
      o.frequency.value = f * pitch;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(actx.destination);
      o.start(t);
      o.stop(t + dur);
      t += dur * 0.85;
    }
  } catch {
    /* 무시 */
  }
}

/** 짧은 잡음 (타격 "퍽" 소리) */
function noise(dur = 0.06, vol = 0.05, cutoff = 1800): void {
  if (!actx || !enabled) return;
  try {
    const len = Math.floor(actx.sampleRate * dur);
    const buf = actx.createBuffer(1, len, actx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = actx.createBufferSource();
    src.buffer = buf;
    const f = actx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = cutoff;
    const g = actx.createGain();
    g.gain.value = vol;
    src.connect(f);
    f.connect(g);
    g.connect(actx.destination);
    src.start();
  } catch {
    /* 무시 */
  }
}

/** 배경음에서 같이 쓰는 오디오 장치 */
export const audioContext = (): AudioContext | null => actx;

export const sfx = {
  /** 몬스터가 빨간 예고를 시작할 때 작은 경고음 (높이는 몬스터마다) */
  warn: (pitch = 1) => tone([880 * pitch, 660 * pitch], 0.04, 'triangle', 0.025),
  coin: () => tone([988, 1319], 0.06, 'square', 0.035),
  page: () => noise(0.08, 0.035, 3200),
  kill: () => {
    const p = vary();
    noise(0.12, 0.07, 900 * p);
    tone([660, 990, 1320], 0.05, 'triangle', 0.05, p);
  },
  swing: () => tone([520, 300], 0.05, 'triangle', 0.05, vary()),
  hit: () => {
    const p = vary();
    noise(0.05, 0.06, 1400 * p);
    tone([330, 500], 0.06, 'square', 0.045, p);
  },
  crit: () => {
    const p = vary();
    noise(0.08, 0.08, 2400 * p);
    tone([520, 780, 1040], 0.06, 'square', 0.045, p);
  },
  hurt: () => tone([200, 120], 0.12, 'sawtooth', 0.05),
  quiz: () => tone([660, 880], 0.08, 'triangle', 0.06),
  good: () => tone([523, 659, 784, 1046], 0.08, 'triangle', 0.07),
  bad: () => tone([300, 200, 140], 0.1, 'sawtooth', 0.04),
  level: () => tone([392, 523, 659, 784, 1046], 0.09, 'triangle', 0.07),
  bump: () => tone([120], 0.05, 'square', 0.03),
};
