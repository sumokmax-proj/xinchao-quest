/**
 * 상점 (순수 로직). 골드는 퀴즈를 맞혀 적을 처치해야만 얻으므로, 사는 것도 학습 보상이다 (결정 #15: 과금 없음).
 * - consumable(소모품): 개수를 가지고 다니다가 판 중에 쓴다 (반미)
 * - gear(장비): 한 번 사면 계속 효과. 같은 계열은 높은 단계가 낮은 단계를 대신한다 (검 2단계, 갑옷 2단계)
 */
export interface ShopItem {
  id: string;
  shop: 'food' | 'gear'; // 반미 가게 / 대장간
  vi: string; // 베트남어 이름 (상점에서도 단어를 본다)
  ko: string;
  desc: string;
  kind: 'consumable' | 'gear';
  price: number;
  max?: number; // 소모품 최대 보유 수
  heal?: number; // 최대 HP 대비 회복 비율
  atkBuff?: number; // 먹으면 이번 판 공격력 +비율
  stageQuizTime?: number; // 판을 시작할 때 마시면 이번 판 퀴즈 +초
  quizTime?: number; // 퀴즈 제한시간 +초
  charms?: number; // 판마다 오답 보호 횟수
  attack?: number; // 공격력 +
  guard?: number; // 받는 피해 감소 비율
  requires?: string; // 먼저 가지고 있어야 하는 장비
}

export interface Inventory {
  items: Record<string, number>; // 소모품 id → 개수
  gear: string[]; // 산 장비 id
}

export const emptyInventory = (): Inventory => ({ items: {}, gear: [] });

export type BuyCheck = 'ok' | 'gold' | 'max' | 'owned' | 'requires';

/** 살 수 있나. 안 되면 이유 */
export function canBuy(item: ShopItem, inv: Inventory, gold: number): BuyCheck {
  if (item.kind === 'gear' && inv.gear.includes(item.id)) return 'owned';
  if (item.requires && !inv.gear.includes(item.requires)) return 'requires';
  if (item.kind === 'consumable' && (inv.items[item.id] ?? 0) >= (item.max ?? Infinity)) return 'max';
  if (gold < item.price) return 'gold';
  return 'ok';
}

/** 사기. 살 수 없으면 그대로 돌려준다 (원본은 건드리지 않음) */
export function buy(item: ShopItem, inv: Inventory, gold: number): { inv: Inventory; gold: number; ok: boolean } {
  if (canBuy(item, inv, gold) !== 'ok') return { inv, gold, ok: false };
  const next: Inventory = { items: { ...inv.items }, gear: inv.gear.slice() };
  if (item.kind === 'consumable') next.items[item.id] = (next.items[item.id] ?? 0) + 1;
  else next.gear.push(item.id);
  return { inv: next, gold: gold - item.price, ok: true };
}

/** 소모품 하나 쓰기. 없으면 ok: false */
export function useItem(id: string, inv: Inventory): { inv: Inventory; ok: boolean } {
  const n = inv.items[id] ?? 0;
  if (n <= 0) return { inv, ok: false };
  return { inv: { items: { ...inv.items, [id]: n - 1 }, gear: inv.gear.slice() }, ok: true };
}

export interface GearEffects {
  attack: number;
  guard: number;
  quizTime: number;
  charms: number;
}

/** 가진 장비의 효과 합계. 같은 효과는 가장 큰 값만 (황금 검을 사면 강철 검 효과는 겹치지 않음) */
export function gearEffects(items: readonly ShopItem[], inv: Inventory): GearEffects {
  const fx: GearEffects = { attack: 0, guard: 0, quizTime: 0, charms: 0 };
  for (const id of inv.gear) {
    const it = items.find((x) => x.id === id);
    if (!it) continue;
    fx.attack = Math.max(fx.attack, it.attack ?? 0);
    fx.guard = Math.max(fx.guard, it.guard ?? 0);
    fx.quizTime = Math.max(fx.quizTime, it.quizTime ?? 0);
    fx.charms = Math.max(fx.charms, it.charms ?? 0);
  }
  return fx;
}

/**
 * 먹기 버튼이 고를 음식: HP가 많이 빠졌으면(40% 미만) 큰 회복(쌀국수)부터, 아니면 싼 것(반미)부터.
 * 회복 음식이 없으면 null
 */
export function pickFood(items: readonly ShopItem[], inv: Inventory, hpRatio: number): ShopItem | null {
  const foods = items.filter((x) => x.kind === 'consumable' && (x.heal ?? 0) > 0 && (inv.items[x.id] ?? 0) > 0);
  if (!foods.length) return null;
  const sorted = foods.slice().sort((a, b) => (a.heal ?? 0) - (b.heal ?? 0));
  return hpRatio < 0.4 ? sorted[sorted.length - 1] : sorted[0];
}

/** 갑옷을 입었을 때 받는 피해 (최소 1) */
export const guardedDamage = (damage: number, guard: number): number => Math.max(1, Math.round(damage * (1 - guard)));

export function sanitizeInventory(raw: unknown): Inventory {
  const inv = emptyInventory();
  if (!raw || typeof raw !== 'object') return inv;
  const r = raw as Record<string, unknown>;
  if (r.items && typeof r.items === 'object') {
    for (const [k, v] of Object.entries(r.items as Record<string, unknown>)) {
      if (typeof v === 'number' && Number.isFinite(v) && v > 0) inv.items[k] = Math.floor(v);
    }
  }
  if (Array.isArray(r.gear)) inv.gear = r.gear.filter((x): x is string => typeof x === 'string');
  return inv;
}

/** 쓰러졌을 때 권할 장비 순서: 덜 맞는 것(갑옷)부터 */
const HELP_ORDER = ['armor1', 'sword1', 'armor2', 'sword2'];

/** 지금 골드로 살 수 있고 도움이 될 장비 하나. 없으면 null */
export function suggestPurchase(items: readonly ShopItem[], inv: Inventory, gold: number): ShopItem | null {
  for (const id of HELP_ORDER) {
    const item = items.find((x) => x.id === id);
    if (item && canBuy(item, inv, gold) === 'ok') return item;
  }
  return null;
}
