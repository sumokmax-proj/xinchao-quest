import { ART } from './cartoonArt';
import { el } from './dom';

export interface Panel {
  art: string;
  text: string;
}

/**
 * 카툰 컷: 그림 한 장 + 대사 한 줄. 화면을 누르거나 아무 방향키나 누르면 다음 컷, "건너뛰기"로 끝.
 * 컷 아래 점(●○○)으로 몇 컷 남았는지 보여준다.
 */
export class Cartoon {
  private panels: Panel[] = [];
  private i = 0;
  private done: (() => void) | null = null;
  private shownAt = 0;

  constructor() {
    el('cutOv').addEventListener('click', (e) => {
      if ((e.target as HTMLElement).id === 'btnCutSkip') return;
      this.next();
    });
    el('btnCutSkip').addEventListener('click', () => this.finish());
  }

  get isOpen(): boolean {
    return !el('cutOv').hidden;
  }

  play(panels: Panel[], onDone: () => void): void {
    if (!panels.length) {
      onDone();
      return;
    }
    this.panels = panels;
    this.i = 0;
    this.done = onDone;
    el('cutOv').hidden = false;
    this.show();
  }

  /** 방향키·스페이스로도 넘김. 방금 뜬 컷은 실수로 넘기지 않게 0.35초 기다린다 */
  next(): void {
    if (!this.isOpen || performance.now() - this.shownAt < 350) return;
    if (this.i + 1 < this.panels.length) {
      this.i++;
      this.show();
    } else this.finish();
  }

  private show(): void {
    const p = this.panels[this.i];
    this.shownAt = performance.now();
    const art = el('cutArt');
    art.innerHTML = `<svg viewBox="0 0 300 190" role="img" aria-label="${p.text.replace(/"/g, '&quot;')}">${ART[p.art] ?? ''}</svg>`;
    art.classList.remove('pop');
    void art.offsetWidth; // 애니메이션 다시 시작
    art.classList.add('pop');
    el('cutText').textContent = p.text;
    el('cutDots').textContent = this.panels.map((_, k) => (k === this.i ? '●' : '○')).join(' ');
  }

  private finish(): void {
    el('cutOv').hidden = true;
    const cb = this.done;
    this.done = null;
    cb?.();
  }
}
