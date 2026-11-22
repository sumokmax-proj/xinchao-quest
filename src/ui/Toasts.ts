import { el } from './dom';

/** 위쪽 알림 (최대 3개). html은 미리 esc()로 처리된 것만 넣는다 */
export function toast(html: string, cls = ''): void {
  const t = document.createElement('div');
  t.className = 'toast ' + cls;
  t.innerHTML = html;
  const host = el('toasts');
  host.appendChild(t);
  while (host.children.length > 3) host.firstChild?.remove();
  setTimeout(() => t.remove(), 2200);
}

/** 화면 가운데 큰 글씨 (웨이브 시작 등) */
export function banner(title: string, sub?: string): void {
  const b = document.createElement('div');
  b.className = 'banner';
  b.textContent = title;
  if (sub) {
    const s = document.createElement('small');
    s.textContent = sub;
    b.appendChild(s);
  }
  el('bannerHost').appendChild(b);
  setTimeout(() => b.remove(), 1700);
}
