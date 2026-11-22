/** 베트남어 발음: 브라우저에 내장된 베트남어 음성(TTS). 없으면 조용히 넘어간다. */
let viVoice: SpeechSynthesisVoice | null = null;
let enabled = true;

function loadVoices(): void {
  try {
    viVoice = speechSynthesis.getVoices().find((v) => /^vi/i.test(v.lang)) ?? null;
  } catch {
    viVoice = null;
  }
}

export function initVoice(onChange?: () => void): void {
  if (!('speechSynthesis' in window)) return;
  loadVoices();
  try {
    speechSynthesis.onvoiceschanged = () => {
      loadVoices();
      onChange?.();
    };
  } catch {
    /* 무시 */
  }
}

export const hasVietnameseVoice = (): boolean => viVoice !== null;

export function setVoiceEnabled(on: boolean): void {
  enabled = on;
}

export function speak(text: string): void {
  if (!viVoice || !enabled) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.voice = viVoice;
    u.lang = viVoice.lang;
    u.rate = 0.85;
    speechSynthesis.speak(u);
  } catch {
    /* 무시 */
  }
}
