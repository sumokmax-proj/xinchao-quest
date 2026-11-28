import type * as THREE from 'three';
import { CONFIG, type EnemyKind, type EnemyStats } from '../config';
import { faceAngle } from '../combat/BumpAttack';
import { attackCells, canShoot, telegraphDone, telegraphHits, telegraphProgress, type AttackPattern, type TelegraphState } from '../combat/Telegraph';
import { easeInOut, easeOut, lerpAngle } from '../core/math';
import { rand, type Rng } from '../core/random';
import { makeTelegraphMesh } from '../render/Effects';
import { disposeObject, type GoblinModel } from '../render/models';
import { makeMonster } from '../render/monsters';
import { sfx } from '../audio/Sfx';
import { HpLabel } from '../ui/Labels';
import type { Cell, Grid, Step } from '../world/Grid';
import { chooseFleeStep, chooseGoblinStep, isAdjacent } from './goblinBrain';

export type GoblinState = 'idle' | 'dazed' | 'dead';

export interface GoblinContext {
  running: boolean;
  player: Cell;
  playerHp: number;
  isFree: (c: number, r: number, self: Goblin) => boolean;
  onHitPlayer: (damage: number) => void;
  /** 예고가 끝나 공격이 떨어진 순간 (빗나가도). 쇼크웨이브 같은 연출용 */
  onStrike: (self: Goblin, pattern: AttackPattern) => void;
  nowMs: number;
}

export class Goblin {
  readonly boss: boolean;
  readonly stats: EnemyStats;
  readonly model: GoblinModel;
  readonly hpLabel: HpLabel;
  x: number;
  z: number;
  private fromX: number;
  private fromZ: number;
  private moveT = 1;
  hp: number;
  readonly maxHp: number;
  /** 처치까지 남은 퀴즈 수 */
  need: number;
  /** 지역 보스: 지나간 HP 단계 수 */
  phasesDone = 0;
  state: GoblinState = 'idle';
  moveCooldown: number;
  attackCooldown: number;
  private tele: { pattern: AttackPattern; state: TelegraphState; meshes: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[] } | null = null;
  private slamNext = false; // 고블린 왕: 휘두르기와 내려찍기를 번갈아
  private flashT = 0;
  private knockX = 0;
  private knockZ = 0;
  private lungeT = 1;
  private squashT = 0; // 맞았을 때 찌그러짐
  private deathT = 0;
  private spawnT = 0;
  private face: number | undefined;
  private readonly wanderDelay: number;
  gone = false;

  constructor(
    readonly kind: EnemyKind,
    public c: number,
    public r: number,
    private grid: Grid,
    private scene: THREE.Scene,
    private rng: Rng,
    stats: EnemyStats = CONFIG.enemies[kind],
  ) {
    this.stats = stats;
    this.boss = stats.quizCount > 1;
    this.hp = this.maxHp = this.stats.hp;
    this.need = this.stats.quizCount;
    const ai = CONFIG.goblinAi;
    this.moveCooldown = rand(rng, ai.firstMoveMin, ai.firstMoveMax);
    this.attackCooldown = ai.firstAttackDelay;
    this.wanderDelay = rand(rng, ai.wanderMin, ai.wanderMax);
    this.x = this.fromX = grid.worldX(c);
    this.z = this.fromZ = grid.worldZ(r);
    this.model = makeMonster(kind);
    this.model.group.position.set(this.x, 0, this.z);
    this.model.group.scale.setScalar(0.01);
    scene.add(this.model.group);
    this.hpLabel = new HpLabel(this.boss);
  }

  /** 빨간 예고 중인 칸들 (없으면 빈 배열). 자동 플레이 점검용 */
  get telegraphCells(): Cell[] {
    return this.tele ? this.tele.state.cells.map((c) => ({ ...c })) : [];
  }

  get dazed(): boolean {
    return this.state === 'dazed';
  }
  get alive(): boolean {
    return this.state !== 'dead';
  }

  /** 맞았을 때: 하얗게 번쩍, 맞은 방향으로 살짝 밀림, 찌그러짐 (연출 스위치로 하나씩 끌 수 있음) */
  takeHit(dir: Step, fx = { flash: true, knockback: true, squash: true }): void {
    if (fx.flash) this.flashT = CONFIG.feel.hitFlash;
    if (fx.squash) this.squashT = 0.18;
    const knock = fx.knockback ? CONFIG.feel.knockback : 0;
    this.knockX = dir.dc * knock;
    this.knockZ = dir.dr * knock;
  }

  /** HP 0 → 빈사 (퀴즈 시작) */
  daze(): void {
    this.state = 'dazed';
    this.clearTelegraph();
  }

  /** 오답 → HP 회복 후 다시 움직임 */
  recover(hp: number, need: number): void {
    this.hp = hp;
    this.need = need;
    this.state = 'idle';
    this.moveCooldown = CONFIG.goblinAi.resumeMoveDelay;
    this.attackCooldown = CONFIG.goblinAi.resumeAttackDelay;
  }

  kill(): void {
    this.state = 'dead';
    this.deathT = 0;
  }

  clearTelegraph(): void {
    if (!this.tele) return;
    for (const m of this.tele.meshes) {
      this.scene.remove(m);
      m.material.dispose();
    }
    this.tele = null;
  }

  dispose(): void {
    this.clearTelegraph();
    this.scene.remove(this.model.group);
    disposeObject(this.model.group);
    this.hpLabel.remove();
  }

  /**
   * dt: 몬스터의 판단·빨간 예고에 쓰는 시간 (슬로 모션 때만 느려짐).
   * animDt: 보이는 동작에 쓰는 시간 (히트스톱 동안 거의 멈춤 → 예고 시간은 늘지 않는다). core/TimeFx.ts
   */
  update(dt: number, animDt: number, ctx: GoblinContext): void {
    const grp = this.model.group;
    const baseScale = this.stats.scale;
    if (this.spawnT < 1) this.spawnT = Math.min(1, this.spawnT + animDt * 3);
    if (this.state === 'dead') {
      // 쓰러짐: 앞의 절반은 뒤로 벌러덩, 뒤의 절반은 작아지며 사라짐
      this.deathT += animDt * 1.8;
      const fall = Math.min(1, this.deathT * 2);
      grp.rotation.x = -easeOut(fall) * 1.4;
      grp.position.y = Math.sin(fall * Math.PI) * 0.25;
      grp.scale.setScalar(Math.max(0.001, baseScale * (this.deathT < 0.5 ? 1 : 1 - (this.deathT - 0.5) * 2)));
      if (this.deathT >= 1) {
        this.dispose();
        this.gone = true;
      }
      return;
    }
    if (this.flashT > 0) {
      this.flashT -= animDt;
      const k = Math.max(0, this.flashT) * 6;
      this.model.mats.forEach((m) => m.emissive.setRGB(k, k, k));
    } else this.model.mats.forEach((m) => m.emissive.setRGB(0, 0, 0));
    this.knockX *= Math.pow(0.0005, animDt);
    this.knockZ *= Math.pow(0.0005, animDt);

    if (this.moveT < 1) this.moveT = Math.min(1, this.moveT + animDt / this.stats.moveDuration);
    const e = easeInOut(this.moveT);
    this.x = this.fromX + (this.grid.worldX(this.c) - this.fromX) * e;
    this.z = this.fromZ + (this.grid.worldZ(this.r) - this.fromZ) * e;
    let lx = 0;
    let lz = 0;
    if (this.lungeT < 1 && this.face !== undefined) {
      this.lungeT += animDt * 4;
      const s = Math.sin(Math.min(1, this.lungeT) * Math.PI) * 0.3;
      lx = Math.sin(this.face) * s;
      lz = Math.cos(this.face) * s;
    }
    // 공격 준비 동작: 빨간 예고가 차오르는 만큼 몸을 뒤로 젖히고 무기를 치켜든다 (예고와 같은 박자)
    const windup = this.tele ? easeInOut(Math.min(1, telegraphProgress(this.tele.state))) : 0;
    if (windup > 0 && this.face !== undefined) {
      lx -= Math.sin(this.face) * 0.12 * windup;
      lz -= Math.cos(this.face) * 0.12 * windup;
    }
    grp.position.set(this.x + this.knockX + lx, this.moveT < 1 ? Math.sin(this.moveT * Math.PI) * 0.07 : 0, this.z + this.knockZ + lz);
    if (this.face !== undefined) grp.rotation.y = lerpAngle(grp.rotation.y, this.face, Math.min(1, animDt * 14));
    this.model.club.rotation.x = this.lungeT < 1 ? 0.5 + Math.sin(Math.min(1, this.lungeT) * Math.PI) * 1.6 : 0.5 - 1.3 * windup;
    // 크기: 등장 → 숨쉬기 / 맞으면 찌그러짐 / 준비 동작 때 웅크림
    if (this.squashT > 0) this.squashT -= animDt;
    const sq = Math.max(0, this.squashT) / 0.18;
    const breathe = this.moveT >= 1 ? Math.sin(ctx.nowMs / 260 + this.c) * 0.025 : 0;
    const s0 = baseScale * easeOut(this.spawnT);
    grp.scale.set(s0 * (1 + 0.15 * sq), s0 * (1 - 0.22 * sq + breathe - 0.08 * windup), s0 * (1 + 0.15 * sq));

    if (this.state === 'dazed') {
      grp.rotation.z = Math.sin(ctx.nowMs / 120) * 0.14;
      this.model.stars.visible = true;
      this.model.stars.rotation.y += animDt * 5;
      return;
    }
    // 걸을 때 뒤뚱뒤뚱
    grp.rotation.z = this.moveT < 1 ? Math.sin(this.moveT * Math.PI * 2) * 0.12 : 0;
    this.model.stars.visible = false;
    if (!ctx.running) return;

    this.moveCooldown -= dt;
    this.attackCooldown -= dt;

    // 빨간 예고 진행 중
    if (this.tele) {
      const t = this.tele.state;
      t.elapsed += dt;
      const op = 0.18 + 0.5 * telegraphProgress(t) + Math.sin(t.elapsed * 30) * 0.08;
      for (const m of this.tele.meshes) m.material.opacity = op;
      if (telegraphDone(t)) {
        this.lungeT = 0;
        const pattern = this.tele.pattern;
        if (telegraphHits(t, ctx.player, ctx.playerHp)) ctx.onHitPlayer(this.stats.damage);
        ctx.onStrike(this, pattern);
        this.clearTelegraph();
        this.attackCooldown = this.stats.attackRecover;
      }
      return;
    }
    if (this.moveT < 1) return;

    const me = { c: this.c, r: this.r };
    // 황금 고블린: 공격하지 않고 도망친다
    if (this.stats.flee) {
      if (this.moveCooldown > 0) return;
      const { step, cooldown } = chooseFleeStep(me, ctx.player, this.stats.chaseStepDelay, (c, r) => ctx.isFree(c, r, this), this.rng);
      this.moveCooldown = cooldown;
      if (step) this.walk(step);
      return;
    }
    // 원거리(개구리): 같은 줄에 들어오면 멈춰서 쏜다
    if (this.stats.pattern === 'ranged' && canShoot(me, ctx.player, this.stats.range, (c, r) => this.grid.isBlocked(c, r))) {
      this.face = faceAngle(Math.sign(ctx.player.c - this.c), Math.sign(ctx.player.r - this.r));
      if (this.attackCooldown <= 0 && ctx.playerHp > 0) this.startTelegraph(ctx.player);
      return;
    }
    if (isAdjacent(me, ctx.player)) {
      this.face = faceAngle(ctx.player.c - this.c, ctx.player.r - this.r);
      if (this.attackCooldown <= 0 && ctx.playerHp > 0) this.startTelegraph(ctx.player);
      return;
    }
    if (this.moveCooldown > 0) return;
    const { step, cooldown } = chooseGoblinStep(me, ctx.player, this.kind, this.wanderDelay, (c, r) => ctx.isFree(c, r, this), this.rng);
    this.moveCooldown = cooldown;
    if (step) this.walk(step);
  }

  private walk(step: Step): void {
    this.fromX = this.x;
    this.fromZ = this.z;
    this.c += step.dc;
    this.r += step.dr;
    this.moveT = 0;
    this.face = faceAngle(step.dc, step.dr);
  }

  private startTelegraph(target: Cell): void {
    let pattern: AttackPattern = this.stats.pattern;
    if (pattern === 'slam') {
      // 고블린 왕: 3칸 휘두르기 → 주변 8칸 내려찍기 → 휘두르기 ...
      pattern = this.slamNext ? 'slam' : 'wide';
      this.slamNext = !this.slamNext;
    }
    const cells = attackCells(pattern, { c: this.c, r: this.r }, target, (c, r) => this.grid.isBlocked(c, r), this.stats.range);
    const meshes = cells.map((cell) => {
      const mesh = makeTelegraphMesh(this.grid.worldX(cell.c), this.grid.worldZ(cell.r));
      this.scene.add(mesh);
      return mesh;
    });
    // 내려찍기는 시간이 조금 더 걸린다 (8칸을 보고 두 칸 물러날 시간)
    const duration = pattern === 'slam' ? this.stats.telegraph * 1.25 : this.stats.telegraph;
    this.tele = { pattern, state: { cells, elapsed: 0, duration }, meshes };
    // 작은 경고음: 큰 몬스터일수록 낮은 소리
    sfx.warn(1 / Math.max(0.8, this.stats.scale));
    this.face = faceAngle(Math.sign(target.c - this.c), Math.sign(target.r - this.r));
  }
}
