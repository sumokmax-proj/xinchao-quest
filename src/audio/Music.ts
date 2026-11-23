import { audioContext } from './Sfx';

/**
 * 배경음: 파일 없이 WebAudio로 만드는 짧은 반복 음악.
 * 5음계(도·레·미·솔·라)라서 베트남·동아시아 민요 느낌이 난다. 곡마다 빠르기·음계·악보가 다르다.
 * 소리를 끄거나 음악을 끄면 조용해진다.
 */
export type Track = 'field' | 'village' | 'boss';

interface Song {
  bpm: number;
  root: number; // 기준음 (Hz)
  scale: number[]; // 반음 간격
  melody: (number | null)[]; // 8분음표 16칸, 음계 번호 (null = 쉼)
  bass: (number | null)[];
  vol: number;
}

const PENTA = [0, 2, 4, 7, 9, 12, 14, 16];
const MINOR_PENTA = [0, 3, 5, 7, 10, 12, 15, 17];

export const SONGS: Record<Track, Song> = {
  field: {
    bpm: 112,
    root: 293.66, // D
    scale: PENTA,
    melody: [4, null, 3, 4, 5, null, 4, 3, 2, null, 1, 2, 3, null, null, null],
    bass: [0, null, null, null, 3, null, null, null, 2, null, null, null, 3, null, 1, null],
    vol: 0.018,
  },
  village: {
    bpm: 84,
    root: 261.63, // C
    scale: PENTA,
    melody: [2, null, 3, null, 4, 3, 2, null, 1, null, 2, null, 0, null, null, null],
    bass: [0, null, null, null, null, null, null, null, 3, null, null, null, null, null, null, null],
    vol: 0.016,
  },
  boss: {
    bpm: 128,
    root: 220, // A
    scale: MINOR_PENTA,
    melody: [0, 0, 3, null, 2, null, 4, 3, 5, null, 4, 3, 2, null, 1, null],
    bass: [0, null, 0, null, 0, null, 0, null, 3, null, 3, null, 2, null, 2, null],
    vol: 0.02,
  },
};

/** 음계 번호 → 주파수 (순수 함수, 테스트용) */
export function noteFreq(song: Song, step: number, octave = 0): number {
  const semis = song.scale[Math.min(step, song.scale.length - 1)] + octave * 12;
  return song.root * Math.pow(2, semis / 12);
}

/** 8분음표 하나의 길이(초) */
export const eighth = (bpm: number): number => 60 / bpm / 2;

let current: Track | null = null;
let enabled = true;
let timer: number | null = null;
let nextTime = 0;
let stepIndex = 0;
let master: GainNode | null = null;

/** 지금 재생 중인 곡과 지금까지 친 음 수 (자동 플레이 점검용) */
export const musicState = (): { track: Track | null; playing: boolean; steps: number } => ({ track: current, playing: timer !== null, steps: stepIndex });

export function setMusicEnabled(on: boolean): void {
  enabled = on;
  if (master) master.gain.value = on ? 1 : 0;
  if (!on) stopTimer();
  else if (current) startTimer();
}

/** 곡 바꾸기 (null = 끄기). 같은 곡이면 그대로 */
export function playMusic(track: Track | null): void {
  if (track === current) return;
  current = track;
  stepIndex = 0;
  stopTimer();
  if (track && enabled) startTimer();
}

function stopTimer(): void {
  if (timer !== null) window.clearInterval(timer);
  timer = null;
}

function startTimer(): void {
  const ctx = audioContext();
  if (!ctx || timer !== null) return;
  if (!master) {
    master = ctx.createGain();
    master.connect(ctx.destination);
  }
  master.gain.value = 1;
  nextTime = ctx.currentTime + 0.05;
  // 0.1초마다 앞으로 0.3초 안에 칠 음을 미리 예약한다 (탭이 잠깐 느려도 박자가 안 밀림)
  timer = window.setInterval(schedule, 100);
}

function voice(ctx: AudioContext, freq: number, t: number, dur: number, type: OscillatorType, vol: number): void {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(master!);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function schedule(): void {
  const ctx = audioContext();
  if (!ctx || !current || !master) return;
  const song = SONGS[current];
  const len = eighth(song.bpm);
  // 탭을 오래 비웠다 오면 밀린 음을 몰아 치지 않고 지금부터
  if (nextTime < ctx.currentTime - 0.5) nextTime = ctx.currentTime + 0.05;
  while (nextTime < ctx.currentTime + 0.3) {
    const i = stepIndex % 16;
    const bar = Math.floor(stepIndex / 16) % 4;
    const m = song.melody[i];
    // 4마디 중 마지막 마디는 한 옥타브 위에서 살짝 변주
    if (m !== null) voice(ctx, noteFreq(song, m, bar === 3 ? 1 : 0), nextTime, len * 1.6, 'triangle', song.vol);
    const b = song.bass[i];
    if (b !== null) voice(ctx, noteFreq(song, b, -2), nextTime, len * 3, 'sine', song.vol * 1.6);
    nextTime += len;
    stepIndex++;
  }
}
