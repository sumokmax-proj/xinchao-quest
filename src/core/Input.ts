import type { Dir } from '../world/Grid';
import { CONFIG } from '../config';
import { unlockAudio } from '../audio/Sfx';
import { padDirection, SwipeGesture, type GestureAction } from './touch';

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
  /** 지금 방향 입력이 "답"으로 쓰이는 중인가 (퀴즈, 마을 사람 질문) */
  answering(): boolean;
}

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

  bindPad(dpad, h);
  bindSwipe(canvas, h);
}

/** D-pad: 손가락을 떼지 않고 미끄러뜨려도 방향이 바뀐다. 답을 고를 때는 "새로 누른 것"만 인정 (실수 방지) */
function bindPad(dpad: HTMLElement, h: InputHandlers): void {
  const buttons = [...dpad.querySelectorAll<HTMLButtonElement>('button[data-dir]')];
  let pointer: number | null = null;
  let dir: Dir | null = null;
  let answerTouch = false; // 이 터치가 답 고르기 중에 시작됐나

  const light = (d: Dir | null) => buttons.forEach((b) => b.classList.toggle('down-now', b.dataset.dir === d));
  const change = (next: Dir | null) => {
    if (next === dir) return;
    if (dir) h.release(dir);
    dir = next;
    light(dir);
    if (dir) h.press(dir);
  };
  const at = (e: PointerEvent) => {
    const r = dpad.getBoundingClientRect();
    return padDirection(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2), CONFIG.touch.padDead, dir, CONFIG.touch.padSticky);
  };

  dpad.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    unlockAudio();
    change(null);
    pointer = e.pointerId;
    try {
      dpad.setPointerCapture(e.pointerId);
    } catch {
      /* 무시 */
    }
    answerTouch = h.answering();
    change(at(e));
  });
  dpad.addEventListener('pointermove', (e) => {
    if (e.pointerId !== pointer) return;
    // 답 고르기가 걸려 있으면 미끄러진 것은 무시. 걷다가 퀴즈가 뜬 경우도 포함
    if (answerTouch || h.answering()) return;
    change(at(e));
  });
  const up = (e: PointerEvent) => {
    if (e.pointerId !== pointer) return;
    pointer = null;
    change(null);
  };
  dpad.addEventListener('pointerup', up);
  dpad.addEventListener('pointercancel', up);
  dpad.addEventListener('lostpointercapture', up);
  window.addEventListener('blur', () => {
    pointer = null;
    change(null);
  });
}

/** 스와이프: 동작 규칙은 core/touch.ts의 SwipeGesture. 여기서는 포인터 이벤트만 이어 준다 */
function bindSwipe(canvas: HTMLCanvasElement, h: InputHandlers): void {
  const gesture = new SwipeGesture(CONFIG.touch.swipeMin);
  let pointer: number | null = null;
  const apply = (actions: GestureAction[]) => actions.forEach((x) => h[x.type](x.dir));
  const end = (e: PointerEvent) => {
    if (e.pointerId !== pointer) return;
    pointer = null;
    apply(gesture.up());
  };
  canvas.addEventListener('pointerdown', (e) => {
    unlockAudio();
    pointer = e.pointerId;
    apply(gesture.down(e.clientX, e.clientY, h.answering()));
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      /* 무시 */
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerId === pointer) apply(gesture.move(e.clientX, e.clientY, h.answering()));
  });
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('lostpointercapture', end);
  window.addEventListener('blur', () => {
    pointer = null;
    apply(gesture.up());
  });
}
