import { expToNext } from '../combat/rules';
import { el, fmtDong } from './dom';

export interface HudStats {
  level: number;
  hp: number;
  maxHp: number;
  exp: number;
  gold: number;
}

/** 위쪽 HUD: 레벨, HP, EXP, 웨이브, 골드, 도트·소리 버튼 */
export const Hud = {
  update(s: HudStats): void {
    el('lv').textContent = 'Lv ' + s.level;
    el('hpFill').style.width = (s.hp / s.maxHp) * 100 + '%';
    el('hpText').textContent = s.hp + ' / ' + s.maxHp;
    el('hpBar').classList.toggle('low', s.hp / s.maxHp < 0.3);
    el('expFill').style.width = (s.exp / expToNext(s.level)) * 100 + '%';
    el('goldChip').textContent = fmtDong(s.gold);
  },
  /** 반미 버튼: 가진 게 없으면 숨김, HP가 낮으면 반짝여서 "먹을 때"를 알려줌 */
  setItem(count: number, hpRatio: number): void {
    const b = el('btnItem');
    b.hidden = count <= 0;
    el('itemCount').textContent = String(count);
    b.classList.toggle('urge', hpRatio < 0.35);
  },
  /** 마을에서는 웨이브 대신 장소 이름 (null이면 웨이브 표시로 돌아감) */
  setPlace(name: string | null): void {
    if (name) el('waveChip').textContent = name;
    el('btnItem').classList.toggle('away', !!name);
  },
  setWave(index: number, total: number): void {
    el('waveChip').textContent = `웨이브 ${index + 1} / ${total}`;
  },
  setToggles(pixel: boolean, sound: boolean): void {
    el('btnPixel').innerHTML = `도트 모드 <b>${pixel ? '켬' : '끔'}</b>`;
    el('btnSound').innerHTML = `소리 <b>${sound ? '켬' : '끔'}</b>`;
  },
};
