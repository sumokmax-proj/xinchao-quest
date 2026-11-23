import { CONFIG } from '../config';
import type { HeroStats } from '../combat/rules';
import { easeInOut, lerp, lerpAngle } from '../core/math';
import type { HeroModel } from '../render/models';
import type { Cell, Grid } from '../world/Grid';

/** 검사. 칸 위치(c, r)는 즉시 바뀌고, 화면 위치(x, z)는 0.15초 동안 따라간다 */
export class Player {
  c = 0;
  r = 0;
  x = 0;
  z = 0;
  private fromX = 0;
  private fromZ = 0;
  moveT = 1; // 0 → 1: 한 칸 이동 진행도
  face = Math.PI; // 바라보는 방향 (처음엔 위쪽)
  attackCooldown = 0;
  private swingT = 1;
  private lungeT = 1;
  stats: HeroStats & { gold: number } = Player.freshStats();

  constructor(
    private grid: Grid,
    readonly model: HeroModel,
  ) {}

  static freshStats(): HeroStats & { gold: number } {
    return { level: 1, exp: 0, attack: CONFIG.player.attack, hp: CONFIG.player.maxHp, maxHp: CONFIG.player.maxHp, gold: 0 };
  }

  /** 판 시작: 시작 칸으로, 능력치는 저장된 진행(레벨·골드)에서 받아온다 */
  reset(start: Cell, stats: HeroStats & { gold: number } = Player.freshStats()): void {
    this.c = start.c;
    this.r = start.r;
    this.x = this.fromX = this.grid.worldX(start.c);
    this.z = this.fromZ = this.grid.worldZ(start.r);
    this.moveT = 1;
    this.face = Math.PI;
    this.attackCooldown = 0;
    this.swingT = 1;
    this.lungeT = 1;
    this.stats = { ...stats };
    this.model.group.position.set(this.x, 0, this.z);
    this.model.group.rotation.y = Math.PI;
  }

  get cell(): Cell {
    return { c: this.c, r: this.r };
  }

  get ready(): boolean {
    return this.moveT >= 1;
  }

  moveTo(to: Cell): void {
    this.fromX = this.x;
    this.fromZ = this.z;
    this.c = to.c;
    this.r = to.r;
    this.moveT = 0;
  }

  swing(): void {
    this.swingT = 0;
  }

  /** 나무·바위에 툭 부딪힘 */
  wallBump(): void {
    this.lungeT = 0;
    this.attackCooldown = CONFIG.player.wallBumpCooldown;
  }

  tick(dt: number): void {
    this.attackCooldown -= dt;
    if (this.moveT < 1) this.moveT = Math.min(1, this.moveT + dt / CONFIG.player.moveDuration);
  }

  /** 걷기 흔들림, 검 휘두르기, 앞으로 살짝 내딛기 */
  animate(dt: number, nowMs: number): void {
    const m = this.model;
    const e = easeInOut(this.moveT);
    this.x = this.fromX + (this.grid.worldX(this.c) - this.fromX) * e;
    this.z = this.fromZ + (this.grid.worldZ(this.r) - this.fromZ) * e;
    let lx = 0;
    let lz = 0;
    if (this.swingT < 1) {
      this.swingT = Math.min(1, this.swingT + dt / CONFIG.player.swingDuration);
      const t = this.swingT;
      m.pivot.rotation.x = t < 0.25 ? lerp(0.55, -0.9, t / 0.25) : t < 0.6 ? lerp(-0.9, 2.1, (t - 0.25) / 0.35) : lerp(2.1, 0.55, (t - 0.6) / 0.4);
      m.arc.material.opacity = t > 0.3 && t < 0.75 ? 0.75 * (1 - (t - 0.3) / 0.45) : 0;
      const s = Math.sin(t * Math.PI) * 0.14;
      lx = Math.sin(this.face) * s;
      lz = Math.cos(this.face) * s;
    } else {
      m.pivot.rotation.x = 0.55;
      m.arc.material.opacity = 0;
    }
    if (this.lungeT < 1) {
      this.lungeT += dt * 6;
      const s = Math.sin(Math.min(1, this.lungeT) * Math.PI) * 0.1;
      lx += Math.sin(this.face) * s;
      lz += Math.cos(this.face) * s;
    }
    const bob = this.moveT < 1 ? Math.sin(this.moveT * Math.PI) * 0.09 : Math.sin(nowMs / 300) * 0.015;
    m.group.position.set(this.x + lx, bob, this.z + lz);
    m.group.rotation.y = lerpAngle(m.group.rotation.y, this.face, Math.min(1, dt * 18));
  }
}
