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
  setWave(index: number, total: number): void {
    el('waveChip').textContent = `웨이브 ${index + 1} / ${total}`;
  },
  setToggles(pixel: boolean, sound: boolean): void {
    el('btnPixel').textContent = pixel ? '도트 켬' : '도트 끔';
    el('btnSound').textContent = sound ? '소리 켬' : '소리 끔';
  },
};
