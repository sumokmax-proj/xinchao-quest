import { el } from './dom';

export interface DailyInfo {
  count: number;
  goal: number;
  done: boolean;
  streak: number;
}

/** 오늘의 목표 막대: 채운 만큼 차고, 다 채우면 초록. 연속 일수는 불꽃 옆 숫자 */
export function drawDaily(id: string, d: DailyInfo, show: boolean): void {
  const box = el(id);
  box.hidden = !show;
  box.classList.toggle('done', d.done);
  box.setAttribute('aria-label', `오늘의 목표 정답 ${d.count} / ${d.goal}${d.streak ? `, ${d.streak}일 연속` : ''}`);
  const label = document.createElement('span');
  label.textContent = d.done ? '오늘의 목표 달성!' : '오늘의 목표';
  const bar = document.createElement('i');
  bar.style.setProperty('--k', String(d.count / d.goal));
  const num = document.createElement('b');
  num.textContent = `${d.count}/${d.goal}`;
  box.replaceChildren(label, bar, num);
  if (d.streak > 0) {
    const fire = document.createElement('em');
    fire.textContent = `${d.streak}일`;
    box.appendChild(fire);
  }
}
