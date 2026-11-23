import { describe, expect, it } from 'vitest';
import shopJson from '../src/data/shop.json';
import { buy, canBuy, emptyInventory, gearEffects, guardedDamage, pickFood, sanitizeInventory, useItem, type ShopItem } from '../src/core/Shop';

const ITEMS = shopJson as ShopItem[];
const item = (id: string) => ITEMS.find((x) => x.id === id)!;

describe('shop.json', () => {
  it('id가 겹치지 않고, 가격은 양수, requires는 있는 장비', () => {
    expect(new Set(ITEMS.map((x) => x.id)).size).toBe(ITEMS.length);
    ITEMS.forEach((x) => {
      expect(x.price).toBeGreaterThan(0);
      if (x.requires) expect(ITEMS.some((y) => y.id === x.requires)).toBe(true);
    });
  });
});

describe('사기', () => {
  it('골드가 모자라면 못 삼', () => {
    expect(canBuy(item('banhmi'), emptyInventory(), 10000)).toBe('gold');
  });
  it('소모품을 사면 개수 +1, 골드 차감', () => {
    const r = buy(item('banhmi'), emptyInventory(), 50000);
    expect(r.ok).toBe(true);
    expect(r.inv.items.banhmi).toBe(1);
    expect(r.gold).toBe(35000);
  });
  it('소모품 최대 개수', () => {
    const inv = { items: { banhmi: 5 }, gear: [] };
    expect(canBuy(item('banhmi'), inv, 1e9)).toBe('max');
  });
  it('장비는 한 번만', () => {
    const r = buy(item('sword1'), emptyInventory(), 1e9);
    expect(canBuy(item('sword1'), r.inv, 1e9)).toBe('owned');
  });
  it('황금 검은 강철 검이 있어야', () => {
    expect(canBuy(item('sword2'), emptyInventory(), 1e9)).toBe('requires');
    const r = buy(item('sword1'), emptyInventory(), 1e9);
    expect(canBuy(item('sword2'), r.inv, 1e9)).toBe('ok');
  });
  it('못 사면 그대로', () => {
    const inv = emptyInventory();
    const r = buy(item('sword1'), inv, 0);
    expect(r).toEqual({ inv, gold: 0, ok: false });
  });
});

describe('먹을 음식 고르기', () => {
  const inv = { items: { banhmi: 1, pho: 1, caPheTrung: 2 }, gear: [] };
  it('HP가 조금 빠졌으면 반미', () => expect(pickFood(ITEMS, inv, 0.7)?.id).toBe('banhmi'));
  it('HP가 많이 빠졌으면 쌀국수', () => expect(pickFood(ITEMS, inv, 0.2)?.id).toBe('pho'));
  it('회복 음식이 없으면 null (에그커피는 회복 음식 아님)', () => expect(pickFood(ITEMS, { items: { caPheTrung: 1 }, gear: [] }, 0.2)).toBeNull());
  it('모든 음식은 반미 가게, 장비는 대장간', () => {
    ITEMS.forEach((x) => expect(x.shop).toBe(x.kind === 'consumable' ? 'food' : 'gear'));
  });
});

describe('쓰기와 효과', () => {
  it('반미 쓰기', () => {
    const r = useItem('banhmi', { items: { banhmi: 2 }, gear: [] });
    expect(r.ok).toBe(true);
    expect(r.inv.items.banhmi).toBe(1);
    expect(useItem('banhmi', emptyInventory()).ok).toBe(false);
  });
  it('장비 효과: 같은 계열은 큰 값만', () => {
    const fx = gearEffects(ITEMS, { items: {}, gear: ['sword1', 'sword2', 'armor1', 'hourglass', 'charm'] });
    expect(fx).toEqual({ attack: 14, guard: 0.15, quizTime: 2, charms: 1 });
  });
  it('갑옷 피해 감소, 최소 1', () => {
    expect(guardedDamage(20, 0.3)).toBe(14);
    expect(guardedDamage(1, 0.3)).toBe(1);
  });
  it('깨진 저장 값 고치기', () => {
    expect(sanitizeInventory({ items: { banhmi: 2.5, x: -1 }, gear: ['sword1', 3] })).toEqual({ items: { banhmi: 2 }, gear: ['sword1'] });
    expect(sanitizeInventory(null)).toEqual(emptyInventory());
  });
});
