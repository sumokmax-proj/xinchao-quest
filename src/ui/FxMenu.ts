import { FX_LIST, fxOn, type FxId } from '../core/Fx';
import { el } from './dom';

/** 개발용 연출 스위치 목록. 누르면 켜고 끔 */
export function renderFxMenu(off: readonly FxId[], onToggle: (id: FxId) => void): void {
  el('fxList').replaceChildren(
    ...FX_LIST.map((f) => {
      const b = document.createElement('button');
      b.type = 'button';
      const on = fxOn(off, f.id);
      b.className = on ? 'fxsw on' : 'fxsw';
      b.dataset.fx = f.id;
      b.setAttribute('aria-pressed', String(on));
      b.textContent = f.name;
      b.addEventListener('click', () => onToggle(f.id));
      return b;
    }),
  );
}
