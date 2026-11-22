import { CONFIG, type EnemyKind } from '../config';
import mapJson from '../data/maps/field-01.json';
import wavesJson from '../data/waves.json';
import wordsJson from '../data/words.json';
import { decideBump, faceAngle } from '../combat/BumpAttack';
import { isCorrect, makeQuestion, resolveQuiz, updateWrongNote, type Question, type Word } from '../combat/QuizSystem';
import { applyDamage, gainExp, rollDamage } from '../combat/rules';
import { sfx, setSoundEnabled, unlockAudio } from '../audio/Sfx';
import { initVoice, setVoiceEnabled, speak } from '../audio/Voice';
import { Goblin } from '../entities/Goblin';
import { Player } from '../entities/Player';
import { makeHero } from '../render/models';
import { Particles } from '../render/Effects';
import { buildMap, createScene } from '../render/scene';
import { el, esc, fmtDong } from '../ui/dom';
import { Hud } from '../ui/Hud';
import { floatText, toScreen } from '../ui/Labels';
import { hideEnd, hideStart, setStartNote, showEnd, type EndSummary } from '../ui/Overlays';
import { QuizBubble } from '../ui/QuizBubble';
import { banner, toast } from '../ui/Toasts';
import { CameraRig } from '../world/CameraRig';
import { DIRS, Grid, findSpawnCell, isCellFree, type Cell, type Dir, type MapData } from '../world/Grid';
import { defaultRng } from './random';
import { loadSave, persist, type SaveData } from './Save';
import { Timers } from './Timers';
import { WaveProgress, type WaveData } from './Waves';

const MAP = mapJson as MapData;
const WAVES = wavesJson as WaveData[];
const WORDS = wordsJson as Word[];

/** debugSnapshot()이 돌려주는 형식 */
export interface DebugSnapshot {
  running: boolean;
  result: 'win' | 'lose' | null;
  map: string[];
  player: { c: number; r: number; hp: number; maxHp: number; level: number; gold: number; ready: boolean };
  goblins: { c: number; r: number; hp: number; maxHp: number; state: string; boss: boolean; telegraph: Cell | null }[];
  quiz: { answerSide: 0 | 1; acceptsInput: boolean; prompt: string } | null;
  wave: { index: number; total: number };
  stats: { quiz: number; correct: number; kills: number; hurt: number };
}

interface QuizRun {
  goblin: Goblin;
  timeLeft: number;
  armedAt: number; // 이 시각(ms) 전에는 답 입력 무시
  locked: boolean; // 답을 고른 뒤 결과 연출 중
  question: Question;
}

/** 게임 한 판의 진행을 묶는 곳. 계산은 combat/·world/의 순수 함수에 맡기고, 여기서는 순서만 정한다 */
export class Game {
  readonly scene = createScene();
  readonly cam = new CameraRig();
  readonly grid = new Grid(MAP.rows);
  private readonly rng = defaultRng;
  private readonly timers = new Timers();
  private readonly particles: Particles;
  private readonly player: Player;
  private readonly waves = new WaveProgress(WAVES.length);
  private readonly bubble: QuizBubble;
  private save: SaveData = loadSave();
  private goblins: Goblin[] = [];
  private quiz: QuizRun | null = null;
  private running = false;
  private held: Dir[] = []; // 누르고 있는 방향 (마지막이 우선)
  private queued: Dir | null = null; // 한 번 톡 누른 방향 (이동 중이어도 다음 칸에서 실행)
  private hintHidden = false;
  private run = { quiz: 0, correct: 0, wrong: new Map<string, string>(), kills: 0, start: 0 };
  private result: 'win' | 'lose' | null = null;
  private hurtCount = 0;

  constructor() {
    buildMap(this.scene, this.grid);
    this.particles = new Particles(this.scene);
    const hero = makeHero();
    this.scene.add(hero.group);
    this.player = new Player(this.grid, hero);
    this.bubble = new QuizBubble((side) => this.answer(side));
    setSoundEnabled(this.save.sound);
    setVoiceEnabled(this.save.sound);
    initVoice(() => this.updateStartNote());
    this.updateStartNote();
    this.reset();
  }

  get settings(): Readonly<SaveData> {
    return this.save;
  }

  /* ---------- 판 시작·끝 ---------- */

  reset(): void {
    this.goblins.forEach((g) => g.dispose());
    this.goblins = [];
    this.particles.clear();
    this.timers.clear();
    this.endQuiz();
    this.player.reset(MAP.start);
    this.cam.snapTo(this.player.x, this.player.z);
    this.run = { quiz: 0, correct: 0, wrong: new Map(), kills: 0, start: performance.now() };
    this.result = null;
    this.hurtCount = 0;
    this.waves.reset();
    this.held = [];
    this.queued = null;
    this.spawnWave(0, true);
    this.updateHud();
  }

  start(): void {
    unlockAudio();
    hideStart();
    this.running = true;
    banner('웨이브 1', WAVES[0].label);
  }

  retry(): void {
    unlockAudio();
    hideEnd();
    this.reset();
    this.running = true;
    banner('웨이브 1', WAVES[0].label);
  }

  private finish(win: boolean): void {
    this.running = false;
    this.result = win ? 'win' : 'lose';
    const summary: EndSummary = {
      win,
      correct: this.run.correct,
      total: this.run.quiz,
      kills: this.run.kills,
      level: this.player.stats.level,
      seconds: Math.round((performance.now() - this.run.start) / 1000),
      wrongWords: this.run.wrong,
    };
    showEnd(summary);
  }

  /* ---------- 설정 ---------- */

  togglePixel(): void {
    this.save.pixel = !this.save.pixel;
    persist(this.save);
  }

  toggleSound(): void {
    this.save.sound = !this.save.sound;
    setSoundEnabled(this.save.sound);
    setVoiceEnabled(this.save.sound);
    persist(this.save);
    unlockAudio();
  }

  private updateStartNote(): void {
    const wc = Object.keys(this.save.wrong).length;
    setStartNote(wc ? `지난번에 틀린 단어 ${wc}개가 더 자주 나와요.` : '');
  }

  /* ---------- 입력 ---------- */

  press(dir: Dir): void {
    if (this.quiz) {
      if (dir === 'left') this.answer(0);
      else if (dir === 'right') this.answer(1);
      return;
    }
    this.held = this.held.filter((d) => d !== dir);
    this.held.push(dir);
    this.queued = dir;
    this.hideHint();
  }

  release(dir: Dir): void {
    this.held = this.held.filter((d) => d !== dir);
  }

  releaseAll(): void {
    this.held = [];
  }

  private hideHint(): void {
    if (this.hintHidden) return;
    this.hintHidden = true;
    setTimeout(() => {
      el('hint').style.opacity = '0';
    }, 2500);
  }

  /* ---------- 웨이브 ---------- */

  private spawnWave(index: number, silent: boolean): void {
    const w = WAVES[index];
    w.enemies.forEach((k) => this.spawnGoblin(k));
    Hud.setWave(index, WAVES.length);
    if (!silent) banner('웨이브 ' + (index + 1), w.label);
  }

  private spawnGoblin(kind: EnemyKind): void {
    const occupied: Cell[] = [this.player.cell, ...this.goblins.filter((g) => g.alive).map((g) => ({ c: g.c, r: g.r }))];
    const ai = CONFIG.goblinAi;
    const cell = findSpawnCell(this.grid, MAP.spawnArea, occupied, this.player.cell, ai.spawnMinDistance, this.rng, ai.spawnMaxTries);
    this.goblins.push(new Goblin(kind, cell.c, cell.r, this.grid, this.scene, this.rng));
  }

  /* ---------- 점유 ---------- */

  private goblinAt(c: number, r: number): Goblin | undefined {
    return this.goblins.find((g) => g.alive && g.c === c && g.r === r);
  }

  /** 고블린 self가 (c, r)로 갈 수 있나: 막힘 없음 + 플레이어·다른 고블린 없음 */
  private freeFor(c: number, r: number, self: Goblin): boolean {
    const occupied: Cell[] = [this.player.cell];
    for (const g of this.goblins) if (g !== self && g.alive) occupied.push({ c: g.c, r: g.r });
    return isCellFree(this.grid, c, r, occupied);
  }

  /* ---------- 플레이어 행동 ---------- */

  /** 입력 처리. false면 아직 못 함(공격 쿨다운) → 입력을 기억해 둔다 */
  private tryAct(dir: Dir): boolean {
    const p = this.player;
    const d = DIRS[dir];
    p.face = faceAngle(d.dc, d.dr);
    const result = decideBump(p.cell, dir, this.grid, (c, r) => this.goblinAt(c, r), p.attackCooldown <= 0);
    switch (result.kind) {
      case 'attack':
        this.attack(result.target, dir);
        return true;
      case 'wait':
        return false;
      case 'ignore':
      case 'still':
        return true;
      case 'wall':
        p.wallBump();
        sfx.bump();
        return true;
      case 'move':
        p.moveTo(result.to);
        return true;
    }
  }

  private attack(g: Goblin, dir: Dir): void {
    const p = this.player;
    p.attackCooldown = CONFIG.player.attackCooldown;
    p.swing();
    sfx.swing();
    const { damage, crit } = rollDamage(p.stats.attack, this.rng);
    g.hp = applyDamage(g.hp, damage);
    g.takeHit(DIRS[dir]);
    floatText(this.cam.camera, g.x, 1.3, g.z, (crit ? '크리티컬 ' : '') + damage, crit ? 'crit' : '');
    if (crit) sfx.crit();
    else sfx.hit();
    this.cam.shake(crit ? CONFIG.feel.shakeCrit : CONFIG.feel.shakeHit);
    if (g.hp <= 0) this.startQuiz(g);
  }

  private hurtPlayer(damage: number): void {
    const p = this.player;
    p.stats.hp = applyDamage(p.stats.hp, damage);
    this.hurtCount++;
    floatText(this.cam.camera, p.x, 1.3, p.z, '-' + damage, 'hurtn');
    sfx.hurt();
    this.cam.shake(CONFIG.feel.shakeHurt);
    const h = el('hurt');
    h.classList.add('on');
    setTimeout(() => h.classList.remove('on'), 60);
    this.updateHud();
    if (p.stats.hp <= 0) {
      this.endQuiz();
      this.running = false;
      this.timers.after(CONFIG.feel.gameOverDelay, () => this.finish(false));
    }
  }

  /* ---------- 퀴즈 ---------- */

  private startQuiz(g: Goblin): void {
    g.daze();
    this.held = [];
    this.queued = null;
    this.quiz = {
      goblin: g,
      timeLeft: CONFIG.quiz.timeLimit,
      armedAt: performance.now() + CONFIG.quiz.inputGuard * 1000,
      locked: false,
      question: makeQuestion(WORDS, this.save.wrong, this.rng),
    };
    this.showQuestion();
    this.bubble.setTeach(!this.save.answeredQuiz);
    this.bubble.show();
    sfx.quiz();
  }

  private showQuestion(): void {
    if (!this.quiz) return;
    this.bubble.setQuestion(this.quiz.question, this.quiz.goblin.need, this.quiz.goblin.boss);
  }

  private nextQuestion(): void {
    if (!this.quiz) return;
    this.quiz.question = makeQuestion(WORDS, this.save.wrong, this.rng);
    this.quiz.timeLeft = CONFIG.quiz.timeLimit;
    this.quiz.locked = false;
    this.showQuestion();
  }

  answer(side: 0 | 1): void {
    if (!this.quiz || this.quiz.locked || performance.now() < this.quiz.armedAt) return;
    this.resolve(side);
  }

  /** side: 0 왼쪽, 1 오른쪽, null 시간 초과 */
  private resolve(side: 0 | 1 | null): void {
    const quiz = this.quiz;
    if (!quiz) return;
    const q = quiz.question;
    const g = quiz.goblin;
    const ok = isCorrect(q, side);
    quiz.locked = true;
    this.run.quiz++;
    this.bubble.markResult(q, side);
    this.save.wrong = updateWrongNote(this.save.wrong, q.word.vi, ok);
    if (side !== null) {
      // 시간 초과가 아니라 직접 답했으면, 답하는 법을 안 것으로 보고 다음부터 깜빡이지 않음
      this.save.answeredQuiz = true;
      this.bubble.setTeach(false);
    }
    persist(this.save);
    speak(q.word.vi);
    const outcome = resolveQuiz(g.need, ok, g.maxHp, g.stats.quizCount);
    const pair = `${esc(q.word.vi)} = ${esc(q.word.ko)}`;

    if (outcome.kind === 'next') {
      this.run.correct++;
      sfx.good();
      g.need = outcome.remaining;
      toast(`<b>정답!</b> ${pair} · 한 문제 더`, 'good');
      this.timers.after(CONFIG.quiz.nextQuestionDelay, () => {
        if (this.quiz && this.quiz.goblin === g) this.nextQuestion();
      });
    } else if (outcome.kind === 'kill') {
      this.run.correct++;
      sfx.good();
      toast(`<b>정답!</b> ${pair}`, 'good');
      this.timers.after(CONFIG.quiz.finishDelay, () => this.killGoblin(g));
    } else {
      this.run.wrong.set(q.word.vi, q.word.ko);
      sfx.bad();
      const shown = q.viToKo ? q.word.vi : q.word.ko;
      toast(`${side === null ? '시간 초과' : '오답'} · 정답은 <b>${esc(q.answer)}</b> (${esc(shown)})`, 'bad');
      this.timers.after(CONFIG.quiz.recoverDelay, () => {
        g.recover(outcome.hp, outcome.remaining);
        floatText(this.cam.camera, g.x, 1.4, g.z, '+' + outcome.hp, 'heal');
        this.endQuiz();
      });
    }
  }

  private killGoblin(g: Goblin): void {
    this.endQuiz();
    this.player.swing();
    sfx.swing();
    g.kill();
    this.run.kills++;
    this.particles.burst(g.x, g.z, g.boss ? 26 : 14, g.boss ? '#d63b2b' : '#6aa83e');
    this.cam.shake(g.boss ? CONFIG.feel.shakeBossKill : CONFIG.feel.shakeKill);
    const { exp, gold } = g.stats;
    const p = this.player;
    p.stats.gold += gold;
    const { stats, levelUps } = gainExp(p.stats, exp);
    p.stats = { ...stats, gold: p.stats.gold };
    for (const u of levelUps) {
      toast(`<b>레벨 업!</b> Lv ${u.level} · 공격력 ${u.attack}`, 'level');
      sfx.level();
    }
    floatText(this.cam.camera, g.x, 1.6, g.z, `+${exp} EXP · +${fmtDong(gold)}`, '');
    this.updateHud();
  }

  private endQuiz(): void {
    this.quiz = null;
    this.bubble.hide();
  }

  /* ---------- 매 프레임 ---------- */

  update(dt: number, nowMs: number): void {
    this.timers.update(dt);
    const p = this.player;

    p.tick(dt);
    if (this.running && !this.quiz && p.ready && p.stats.hp > 0) {
      const dir = this.queued ?? this.held[this.held.length - 1];
      if (dir && this.tryAct(dir)) this.queued = null;
    }

    const ctx = {
      running: this.running,
      player: p.cell,
      playerHp: p.stats.hp,
      isFree: (c: number, r: number, self: Goblin) => this.freeFor(c, r, self),
      onHitPlayer: (damage: number) => this.hurtPlayer(damage),
      nowMs,
    };
    for (const g of this.goblins) {
      // 퀴즈 중에는 퀴즈 대상이 아닌 고블린만 0.25배속
      const slow = this.quiz && this.quiz.goblin !== g ? CONFIG.quiz.othersSpeed : 1;
      ctx.playerHp = p.stats.hp;
      ctx.running = this.running;
      g.update(dt * slow, ctx);
    }
    this.goblins = this.goblins.filter((g) => !g.gone);

    if (this.quiz && !this.quiz.locked && this.running) {
      this.quiz.timeLeft -= dt;
      if (this.quiz.timeLeft <= 0) this.resolve(null);
    }

    p.animate(dt, nowMs);

    if (this.running) {
      const ev = this.waves.check(this.goblins.length);
      if (ev?.kind === 'next') {
        this.timers.after(CONFIG.wave.nextDelay, () => {
          this.waves.advance();
          this.spawnWave(ev.index, false);
        });
      } else if (ev?.kind === 'clear') {
        this.timers.after(CONFIG.wave.clearDelay, () => this.finish(true));
      }
    }

    this.particles.update(dt);
    this.cam.update(dt, p);
  }

  /** HTML 라벨(HP 바, 퀴즈 말풍선)을 3D 위치에 맞춘다. 렌더 후에 호출 */
  updateLabels(screenW: number): void {
    const camera = this.cam.camera;
    for (const g of this.goblins) {
      const pos = g.model.group.position;
      const s = toScreen(camera, pos.x, g.boss ? 1.75 : 1.3, pos.z);
      g.hpLabel.update(g.state === 'idle', s.x, s.y, g.hp / g.maxHp);
    }
    if (this.quiz) {
      const g = this.quiz.goblin;
      const pos = g.model.group.position;
      const s = toScreen(camera, pos.x, g.boss ? 1.95 : 1.5, pos.z);
      this.bubble.position(s.x, s.y, screenW);
      this.bubble.setTimeLeft(this.quiz.timeLeft / CONFIG.quiz.timeLimit);
    }
  }

  /**
   * 지금 게임 상태를 평범한 객체로 돌려준다. 자동 플레이 점검(scripts/playtest.mjs)이 읽는 약속된 형식.
   * 게임 내부 구조가 바뀌어도 이 형식은 유지한다. 개발 서버에서만 window.__game으로 열린다.
   */
  debugSnapshot(): DebugSnapshot {
    const p = this.player;
    const q = this.quiz;
    return {
      running: this.running,
      result: this.result,
      map: this.grid.rows.slice(),
      player: { c: p.c, r: p.r, hp: p.stats.hp, maxHp: p.stats.maxHp, level: p.stats.level, gold: p.stats.gold, ready: p.ready },
      goblins: this.goblins
        .filter((g) => g.alive)
        .map((g) => ({ c: g.c, r: g.r, hp: g.hp, maxHp: g.maxHp, state: g.state, boss: g.boss, telegraph: g.telegraphCell })),
      quiz: q
        ? {
            answerSide: q.question.options.indexOf(q.question.answer) as 0 | 1,
            acceptsInput: !q.locked && performance.now() >= q.armedAt,
            prompt: q.question.prompt,
          }
        : null,
      wave: { index: this.waves.index, total: WAVES.length },
      stats: { quiz: this.run.quiz, correct: this.run.correct, kills: this.run.kills, hurt: this.hurtCount },
    };
  }

  private updateHud(): void {
    Hud.update({ ...this.player.stats });
  }
}
