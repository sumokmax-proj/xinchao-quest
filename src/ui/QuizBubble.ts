import type { Question } from '../combat/QuizSystem';
import { el } from './dom';

/** 빈사 고블린 머리 위 말풍선 퀴즈 */
export class QuizBubble {
  private root = el('quiz');
  private kind = el('qKind');
  private text = el('qText');
  private btns = [el<HTMLButtonElement>('ansL'), el<HTMLButtonElement>('ansR')] as const;
  private btnTexts = [el('ansLText'), el('ansRText')] as const;
  private timer = el('qTimer');
  private dim = el('dim');
  private dpad = el('dpad');
  private phaseHead = el('qPhase');

  constructor(onAnswer: (side: 0 | 1) => void) {
    this.btns[0].addEventListener('click', () => onAnswer(0));
    this.btns[1].addEventListener('click', () => onAnswer(1));
  }

  show(): void {
    this.root.hidden = false;
    this.dim.classList.add('on');
    this.dpad.classList.add('quizmode');
  }

  hide(): void {
    this.root.hidden = true;
    this.dim.classList.remove('on');
    this.dpad.classList.remove('quizmode');
  }

  /**
   * 말풍선 머리띠 한 줄 (따로 띄우면 문제를 가림).
   * phase: 지역 보스의 HP 단계 퀴즈, revive: 부활한 복습 단어
   */
  setHead(kind: 'phase' | 'revive' | null): void {
    this.phaseHead.hidden = !kind;
    this.phaseHead.classList.toggle('revive', kind === 'revive');
    if (kind) this.phaseHead.textContent = kind === 'phase' ? '왕이 비틀거린다! 맞히면 큰 피해' : '부활한 단어! 맞히면 보너스';
  }

  /** 처음 퀴즈를 만난 사람에게 ←/→ 답 버튼을 깜빡여 보여준다 */
  setTeach(on: boolean): void {
    this.root.classList.toggle('teach', on);
  }

  setQuestion(q: Question, remaining: number, isBoss: boolean): void {
    this.kind.textContent = isBoss && remaining > 1 ? `${q.kindLabel} · ${remaining}문제 남음` : q.kindLabel;
    this.text.textContent = q.prompt;
    this.root.classList.toggle('tone', q.kind === 'tone');
    this.text.lang = q.viToKo ? 'vi' : 'ko';
    q.options.forEach((opt, i) => {
      this.btnTexts[i].textContent = opt;
      this.btns[i].className = '';
      this.btns[i].lang = q.viToKo ? 'ko' : 'vi';
    });
  }

  /** 정답 칸은 초록, 고른 오답은 빨강 */
  markResult(q: Question, side: 0 | 1 | null): void {
    q.options.forEach((opt, i) => {
      if (opt === q.answer) this.btns[i].classList.add('right');
      else if (i === side) this.btns[i].classList.add('wrong');
    });
  }

  /** 말풍선을 고블린 머리(px) 위에 두되 화면 밖으로 나가지 않게, 꼬리는 고블린을 가리키게 */
  position(headX: number, headY: number, screenW: number): void {
    const half = this.root.offsetWidth / 2;
    const cx = Math.min(screenW - half - 10, Math.max(half + 10, headX));
    const cy = Math.max(this.root.offsetHeight + 90, headY);
    this.root.style.left = cx + 'px';
    this.root.style.top = cy + 'px';
    this.root.style.setProperty('--tail', Math.min(this.root.offsetWidth - 20, Math.max(20, headX - cx + half)) + 'px');
    this.dim.style.setProperty('--fx', headX + 'px');
    this.dim.style.setProperty('--fy', headY + 40 + 'px');
  }

  /** 남은 시간 막대 (1 → 0) */
  setTimeLeft(ratio: number): void {
    const k = Math.max(0, ratio);
    this.timer.style.width = k * 100 + '%';
    this.timer.classList.toggle('low', k < 0.35);
  }
}
