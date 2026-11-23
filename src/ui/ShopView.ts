import { canBuy, type Inventory, type ShopItem } from '../core/Shop';
import { el, fmtDong } from './dom';

/**
 * 상점 화면. 줄마다 베트남어 이름(크게)과 한국어·효과(작게), 오른쪽에 가격 버튼.
 * 살 수 없는 줄은 버튼이 흐려지고 이유가 짧게 (가짐 / 골드 부족 / 먼저 필요 / 가득).
 */
export class ShopView {
  private items: readonly ShopItem[] = [];

  constructor(private onBuy: (id: string) => void) {
    el('btnShopClose').addEventListener('click', () => this.close());
  }

  open(items: readonly ShopItem[], inv: Inventory, gold: number, title: string): void {
    this.items = items;
    el('shopTitle').textContent = title;
    el('shopOv').hidden = false;
    this.render(inv, gold);
  }

  close(): void {
    el('shopOv').hidden = true;
  }

  get isOpen(): boolean {
    return !el('shopOv').hidden;
  }

  render(inv: Inventory, gold: number): void {
    el('shopGold').textContent = fmtDong(gold);
    const list = el('shopList');
    list.replaceChildren();
    for (const it of this.items) {
      const check = canBuy(it, inv, gold);
      const row = document.createElement('div');
      row.className = 'shoprow' + (check === 'owned' ? ' owned' : '');
      const icon = document.createElement('span');
      icon.className = 'sicon ' + it.id;
      const body = document.createElement('span');
      body.className = 'sbody';
      const vi = document.createElement('b');
      vi.lang = 'vi';
      vi.textContent = it.vi;
      const ko = document.createElement('small');
      const have = it.kind === 'consumable' ? ` · ${inv.items[it.id] ?? 0}/${it.max}` : '';
      ko.textContent = `${it.ko} · ${it.desc}${have}`;
      body.append(vi, ko);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'buy';
      btn.dataset.id = it.id;
      btn.disabled = check !== 'ok';
      const label: Record<string, string> = { owned: '가짐', max: '가득', requires: '잠김' };
      btn.textContent = label[check] ?? fmtDong(it.price);
      if (check === 'gold') btn.classList.add('poor');
      btn.addEventListener('click', () => this.onBuy(it.id));
      row.append(icon, body, btn);
      list.appendChild(row);
    }
  }
}
