import type { Dir } from '../world/Grid';
import { unlockAudio } from '../audio/Sfx';

const KEYMAP: Record<string, Dir> = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  w: 'up', s: 'down', a: 'left', d: 'right',
  W: 'up', S: 'down', A: 'left', D: 'right',
};

export interface InputHandlers {
  press(dir: Dir): void;
  release(dir: Dir): void;
  releaseAll(): void;
  /** 소모품(반미) 쓰기 */
  item(): void;
  /** 시작·결과 화면이 떠 있으면 키보드 입력 무시 */
  blocked(): boolean;
}

const SWIPE_MIN = 24; // px. 이보다 짧게 움직이면 스와이프가 아님

/** 키보드(방향키·WASD), 화면 D-pad, 스와이프를 같은 press/release로 바꾼다 */
export function bindInput(canvas: HTMLCanvasElement, dpad: HTMLElement, h: InputHandlers): void {
  window.addEventListener('keydown', (e) => {
    if ((e.key === 'e' || e.key === 'E' || e.key === ' ') && !h.blocked()) {
      e.preventDefault();
      if (!e.repeat) h.item();
      return;
    }
    const dir = KEYMAP[e.key];
    if (!dir) return;
    e.preventDefault();
    if (e.repeat || h.blocked()) return;
    h.press(dir);
  });
  window.addEventListener('keyup', (e) => {
    const dir = KEYMAP[e.key];
    if (dir) h.release(dir);
  });
  window.addEventListener('blur', () => h.releaseAll());

  dpad.querySelectorAll<HTMLButtonElement>('button[data-dir]').forEach((b) => {
    const dir = b.dataset.dir as Dir;
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      unlockAudio();
      b.classList.add('down-now');
      try {
        b.setPointerCapture(e.pointerId);
      } catch {
        /* 무시 */
      }
      h.press(dir);
    });
    const up = () => {
      b.classList.remove('down-now');
      h.release(dir);
    };
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    b.addEventListener('lostpointercapture', up);
  });

  let swipe: { x: number; y: number } | null = null;
  canvas.addEventListener('pointerdown', (e) => {
    swipe = { x: e.clientX, y: e.clientY };
  });
  canvas.addEventListener('pointerup', (e) => {
    if (!swipe) return;
    const dx = e.clientX - swipe.x;
    const dy = e.clientY - swipe.y;
    swipe = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_MIN) return;
    const dir: Dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
    h.press(dir);
    h.release(dir);
  });
}
