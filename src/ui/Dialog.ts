import { el } from './dom';

/** 대화창 아래에 붙는 버튼 하나 (예: 왕 → 단어 도감) */
export interface DialogLink {
  label: string;
  onClick: () => void;
}

/**
 * 마을 대화창 (화면 아래). NPC에게 부딪히면 뜬다.
 * - 그냥 말: 화면을 누르거나 방향키를 누르면 닫힘
 * - 질문: ← / → (D-pad 좌우, 또는 보기 버튼)로 대답. 퀴즈와 같은 조작
 * - 링크 버튼이 있으면: 버튼을 누르면 대화를 닫고 그 화면을 연다 (나머지 자리는 그냥 닫기)
 */
export class Dialog {
  private onClose: (() => void) | null = null;
  private onAnswer: ((side: 0 | 1) => void) | null = null;
  private link: DialogLink | null = null;
  private shownAt = 0;

  constructor() {
    el('talk').addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      const btn = t.closest('button');
      if (btn?.id === 'talkL') this.answer(0);
      else if (btn?.id === 'talkR') this.answer(1);
      else if (btn?.id === 'talkLink') this.follow();
      else this.close();
    });
  }

  get isOpen(): boolean {
    return !el('talk').hidden;
  }

  get asking(): boolean {
    return this.isOpen && this.onAnswer !== null;
  }

  say(name: string, text: string, sub = '', onClose?: () => void, link?: DialogLink): void {
    this.open(name, text, sub);
    el('talkOpts').hidden = true;
    this.onAnswer = null;
    this.onClose = onClose ?? null;
    this.link = link ?? null;
    el('talkLink').hidden = !link;
    if (link) el('talkLink').textContent = link.label;
  }

  /** 링크 버튼: 대화를 닫고 연결된 화면을 연다 */
  private follow(): void {
    const link = this.link;
    if (!link || performance.now() - this.shownAt < 250) return;
    this.close();
    link.onClick();
  }

  ask(name: string, text: string, sub: string, options: [string, string], onAnswer: (side: 0 | 1) => void): void {
    this.open(name, text, sub);
    el('talkOpts').hidden = false;
    el('talkLText').textContent = options[0];
    el('talkRText').textContent = options[1];
    for (const id of ['talkL', 'talkR']) el(id).className = '';
    this.onAnswer = onAnswer;
    this.onClose = null;
  }

  /** 정답·오답 표시 (보기 버튼 색) */
  mark(answer: 0 | 1, picked: 0 | 1): void {
    el(answer === 0 ? 'talkL' : 'talkR').className = 'right';
    if (picked !== answer) el(picked === 0 ? 'talkL' : 'talkR').className = 'wrong';
  }

  /** 방향키 입력. 질문 중이면 ←/→가 대답, 아니면 아무 키나 닫기 */
  key(dir: 'up' | 'down' | 'left' | 'right'): void {
    if (this.asking) {
      if (dir === 'left') this.answer(0);
      else if (dir === 'right') this.answer(1);
      return;
    }
    this.close();
  }

  answer(side: 0 | 1): void {
    if (!this.onAnswer || performance.now() - this.shownAt < 250) return;
    const cb = this.onAnswer;
    this.onAnswer = null;
    cb(side);
  }

  close(): void {
    if (!this.isOpen || this.onAnswer || performance.now() - this.shownAt < 250) return;
    el('talk').hidden = true;
    this.link = null;
    const cb = this.onClose;
    this.onClose = null;
    cb?.();
  }

  /** 대화를 강제로 닫기 (마을을 떠날 때) */
  reset(): void {
    el('talk').hidden = true;
    this.link = null;
    this.onAnswer = null;
    this.onClose = null;
  }

  private open(name: string, text: string, sub: string): void {
    this.shownAt = performance.now();
    this.link = null;
    el('talkLink').hidden = true;
    el('talk').hidden = false;
    el('talkName').textContent = name;
    el('talkText').textContent = text;
    el('talkSub').textContent = sub;
    el('talkSub').hidden = !sub;
  }
}
