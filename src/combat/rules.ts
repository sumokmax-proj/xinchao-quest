import { CONFIG } from '../config';
import { rand, type Rng } from '../core/random';

export interface DamageRoll {
  damage: number;
  crit: boolean;
}

/** 플레이어 공격 데미지: 공격력 × (크리면 1.6) × 0.9~1.1, 반올림 */
export function rollDamage(attack: number, rng: Rng, p = CONFIG.player): DamageRoll {
  const crit = rng() < p.critChance;
  const damage = Math.round(attack * (crit ? p.critMultiplier : 1) * rand(rng, p.damageSpreadMin, p.damageSpreadMax));
  return { damage, crit };
}

/** HP는 0 밑으로 내려가지 않는다 */
export const applyDamage = (hp: number, damage: number): number => Math.max(0, hp - damage);

/** 오답·시간 초과 시 고블린의 새 HP: 최대 HP의 15% (최소 1) */
export const recoverHp = (maxHp: number, ratio: number = CONFIG.quiz.healRatio): number =>
  Math.max(1, Math.round(maxHp * ratio));

export interface HeroStats {
  level: number;
  exp: number;
  attack: number;
  hp: number;
  maxHp: number;
}

/** 다음 레벨까지 필요한 EXP: Lv1 30, Lv2 50, Lv3 70 ... */
export const expToNext = (level: number, l = CONFIG.level): number => l.expBase + (level - 1) * l.expPerLevel;

/** EXP를 더하고, 레벨업을 처리한 새 능력치와 오른 레벨 목록을 돌려준다 */
export function gainExp(s: HeroStats, amount: number, l = CONFIG.level): { stats: HeroStats; levelUps: { level: number; attack: number }[] } {
  const stats = { ...s, exp: s.exp + amount };
  const levelUps: { level: number; attack: number }[] = [];
  while (stats.exp >= expToNext(stats.level, l)) {
    stats.exp -= expToNext(stats.level, l);
    stats.level++;
    stats.attack += l.attackPerLevel;
    stats.maxHp += l.maxHpPerLevel;
    stats.hp = Math.min(stats.maxHp, stats.hp + l.healOnLevelUp);
    levelUps.push({ level: stats.level, attack: stats.attack });
  }
  return { stats, levelUps };
}
