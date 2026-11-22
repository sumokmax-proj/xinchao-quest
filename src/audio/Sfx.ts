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

function tone(freqs: number[], dur = 0.07, type: OscillatorType = 'square', vol = 0.045): void {
  if (!actx || !enabled) return;
  try {
    let t = actx.currentTime;
    for (const f of freqs) {
      const o = actx.createOscillator();
      const g = actx.createGain();
      o.type = type;
      o.frequency.value = f;
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

export const sfx = {
  swing: () => tone([520, 300], 0.05, 'triangle', 0.05),
  hit: () => tone([330, 500], 0.06),
  crit: () => tone([520, 780, 1040], 0.06),
  hurt: () => tone([200, 120], 0.12, 'sawtooth', 0.05),
  quiz: () => tone([660, 880], 0.08, 'triangle', 0.06),
  good: () => tone([523, 659, 784, 1046], 0.08, 'triangle', 0.07),
  bad: () => tone([300, 200, 140], 0.1, 'sawtooth', 0.04),
  level: () => tone([392, 523, 659, 784, 1046], 0.09, 'triangle', 0.07),
  bump: () => tone([120], 0.05, 'square', 0.03),
};
