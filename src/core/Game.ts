import { CONFIG, type EnemyKind } from '../config';
import stagesJson from '../data/stages.json';
import wordsJson from '../data/words.json';
import shopJson from '../data/shop.json';
import villageJson from '../data/village.json';
import storyJson from '../data/story.json';
import { decideBump, faceAngle } from '../combat/BumpAttack';
import { isCorrect, makeQuestion, resolveQuiz, updateWrongNote, type Question, type Word } from '../combat/QuizSystem';
import { applyDamage, gainExp, recoverHp, rollDamage } from '../combat/rules';
import { crossedPhase, phaseBonusHp } from '../combat/BossPhases';
import { sfx, setPitchVary, setSoundEnabled, unlockAudio } from '../audio/Sfx';
import { vibrate } from '../audio/Haptics';
import { fxOn, setAllFx, toggleFx, type FxId } from './Fx';
import { TimeFx } from './TimeFx';
import { dailyReward, dailyView, dayKey, recordCorrect } from './Daily';
import { drawDaily } from '../ui/DailyView';
import { initVoice, setVoiceEnabled, speak } from '../audio/Voice';
import { musicState, playMusic, setMusicEnabled } from '../audio/Music';
import { Goblin } from '../entities/Goblin';
import { Player } from '../entities/Player';
import { makeHero } from '../render/models';
import { Particles, Shockwaves } from '../render/Effects';
import type { AttackPattern } from '../combat/Telegraph';
import { applyTheme, buildMap, createScene, disposeMap } from '../render/scene';
import { getTheme } from '../render/themes';
import { MONSTER_COLOR } from '../render/monsters';
import { el, esc, fmtDong } from '../ui/dom';
import { Hud } from '../ui/Hud';
import { floatText, toScreen } from '../ui/Labels';
import { hideEnd, hideStart, setStartNote, setStartProfile, showEnd, showStart, type EndSummary } from '../ui/Overlays';
import { StageSelect } from '../ui/StageSelect';
import { WordBook } from '../ui/WordBook';
import { ShopView } from '../ui/ShopView';
import { Cartoon, type Panel } from '../ui/Cartoon';
import { Dialog } from '../ui/Dialog';
import { buildVillageProps, makeNpc } from '../render/village';
import { mergeByMaterial } from '../render/merge';
import { loadRigged, type RiggedModel } from '../render/Rigged';
import { QuizBubble } from '../ui/QuizBubble';
import { banner, toast } from '../ui/Toasts';
import { CameraRig } from '../world/CameraRig';
import { DIRS, Grid, findSpawnCell, isCellFree, type Cell, type Dir, type MapData } from '../world/Grid';
import { getMap } from '../world/maps';
import type * as THREE from 'three';
import { defaultRng } from './random';
import { dexProgress, heroStatsFor, recordAnswer } from './Progress';
import { clearProgress, loadSave, persist, type SaveData } from './Save';
import { Timers } from './Timers';
import { WaveProgress } from './Waves';
import { activeNpcs, builtSet, nextBuilding, pickVillageQuestion, questionOptions, touchAt, type Npc, type VillageData } from './Village';
import { buy, gearEffects, guardedDamage, pickFood, useItem, type GearEffects, type ShopItem } from './Shop';
import { isUnlocked, lastUnlocked, pickPool, recordClear, scaleEnemy, stageWords, type StageData } from './Stages';

const STAGES = stagesJson as StageData[];
const WORDS = wordsJson as Word[];
const SHOP = shopJson as ShopItem[];
const VILLAGE = villageJson as VillageData;
const STORY = storyJson as Record<string, Panel[]>;
const VILLAGE_MAP = '__village';
/** KayKit 캐릭터로 보여줄 NPC (look → 파일) */
const NPC_RIGS: Record<string, string> = { smith: 'npc-barbarian.glb', teacher: 'npc-mage.glb', guard: 'npc-rogue.glb' };
const NPC_HIDE = ['1H_Axe_Offhand', '2H_Axe', 'Barbarian_Round_Shield', 'Mug', '1H_Wand', '2H_Staff', 'Spellbook_open', '1H_Crossbow', '2H_Crossbow', 'Knife', 'Knife_Offhand', 'Throwable'];

/** debugSnapshot()이 돌려주는 형식 */
export interface DebugSnapshot {
  running: boolean;
  result: 'win' | 'lose' | null;
  map: string[];
  player: { c: number; r: number; hp: number; maxHp: number; level: number; gold: number; ready: boolean };
  goblins: { kind: string; c: number; r: number; hp: number; maxHp: number; state: string; boss: boolean; telegraph: Cell[] }[];
  quiz: { answerSide: 0 | 1; acceptsInput: boolean; locked: boolean; timeLeft: number; limit: number; prompt: string; kind: string; phase: boolean } | null;
  fx: { off: string[]; slowMo: boolean; shockwaves: number };
  daily: { count: number; goal: number; done: boolean; streak: number };
  wave: { index: number; total: number };
  stage: { index: number; id: string; total: number; unlocked: number };
  items: Record<string, number>;
  gear: string[];
  ending: boolean;
  mode: 'field' | 'village';
  cutscene: boolean;
  dialog: { open: boolean; asking: boolean; answer: 0 | 1 | null };
  npcs: { id: string; c: number; r: number; role: string }[];
  overlay: string | null;
  music: { track: string | null; playing: boolean; steps: number };
  stats: { quiz: number; correct: number; kills: number; hurt: number; learned: number };
  /** 저장된 누적 진행 (판이 끝나도 남음) */
  profile: { level: number; gold: number; kills: number; correct: number; answered: number; runs: number; clears: number; collected: number };
}

interface QuizRun {
  goblin: Goblin;
  timeLeft: number;
  limit: number; // 제한시간 (모래시계가 있으면 +2초)
  phase: boolean; // 지역 보스의 HP 단계 퀴즈 (맞히면 추가 피해, 처치는 아님)
  armedAt: number; // 이 시각(ms) 전에는 답 입력 무시
  locked: boolean; // 답을 고른 뒤 결과 연출 중
  question: Question;
}

/** 게임 한 판의 진행을 묶는 곳. 계산은 combat/·world/의 순수 함수에 맡기고, 여기서는 순서만 정한다 */
export class Game {
  readonly scene = createScene();
  readonly cam = new CameraRig();
  grid!: Grid;
  private map!: MapData;
  private mapRoot: THREE.Group | null = null;
  private mapName = '';
  private stageIndex = 0;
  private pools: { main: Word[]; older: Word[] } = { main: WORDS, older: [] };
  private readonly rng = defaultRng;
  private readonly timers = new Timers();
  private readonly particles: Particles;
  private readonly player: Player;
  private waves = new WaveProgress(1);
  private readonly bubble: QuizBubble;
  private readonly book = new WordBook();
  private readonly shop = new ShopView((id) => this.buyItem(id));
  private fx: GearEffects = { attack: 0, guard: 0, quizTime: 0, charms: 0 };
  private charmsLeft = 0;
  private ending = false;
  private atkBuffed = false; // 분짜 공격력 버프는 판마다 한 번
  private stageQuizTime = 0; // 에그커피: 이번 판 퀴즈 +초
  private mode: 'field' | 'village' = 'field';
  private readonly cartoon = new Cartoon();
  private readonly dialog = new Dialog();
  private npcs: { npc: Npc; group: THREE.Group; label: HTMLDivElement; rig: RiggedModel | null }[] = [];
  private askedThisVisit = new Set<string>(); // 이번 방문에 질문을 한 NPC
  private talkAnswer: 0 | 1 | null = null; // 마을 사람 질문의 정답 쪽 (자동 플레이 점검용)
  private readonly select = new StageSelect((i) => this.play(i));
  private save: SaveData = loadSave();
  private goblins: Goblin[] = [];
  private quiz: QuizRun | null = null;
  private running = false;
  private held: Dir[] = []; // 누르고 있는 방향 (마지막이 우선)
  private queued: Dir | null = null; // 한 번 톡 누른 방향 (이동 중이어도 다음 칸에서 실행)
  private hintHidden = false;
  private run = { quiz: 0, correct: 0, wrong: new Map<string, string>(), learned: new Map<string, string>(), kills: 0, start: 0 };
  private result: 'win' | 'lose' | null = null;
  private hurtCount = 0;
  private readonly timeFx = new TimeFx(); // 히트스톱·슬로 모션
  private readonly shockwaves: Shockwaves;

  constructor() {
    this.particles = new Particles(this.scene);
    this.shockwaves = new Shockwaves(this.scene);
    const hero = makeHero();
    this.scene.add(hero.group);
    this.stageIndex = lastUnlocked(STAGES, this.save.stages);
    this.loadStage(this.stageIndex);
    this.player = new Player(this.grid, hero);
    // KayKit 검사 모델 (CC0). 내려받는 동안은 임시 도형으로 보인다
    void loadRigged('hero.glb', {
      height: 1.35,
      hide: ['1H_Sword_Offhand', 'Rectangle_Shield', 'Round_Shield', 'Spike_Shield', '2H_Sword', 'Badge_Shield'],
    }).then((rig) => {
      if (rig) this.player.attachRig(rig);
    });
    if (this.seen('village')) this.loadVillage();
    this.bubble = new QuizBubble((side) => this.answer(side));
    setSoundEnabled(this.save.sound);
    setVoiceEnabled(this.save.sound);
    setMusicEnabled(this.save.sound && this.save.music);
    this.applyFx();
    initVoice(() => this.updateStartNote());
    this.updateStartNote();
    if (this.mode === 'field') this.reset();
    else this.placeInVillage();
  }

  private seen(id: string): boolean {
    return this.save.seen.includes(id);
  }

  private markSeen(id: string): void {
    if (!this.seen(id)) this.save.seen = [...this.save.seen, id];
    persist(this.save);
  }

  /** 스토리 컷: 처음 한 번만. 보는 동안 게임은 멈춘다 */
  private story(id: string, then: () => void): void {
    if (this.seen(id) || !STORY[id]) {
      then();
      return;
    }
    const wasRunning = this.running;
    this.running = false;
    this.held = [];
    this.queued = null;
    this.cartoon.play(STORY[id], () => {
      this.markSeen(id);
      this.running = wasRunning;
      then();
    });
  }

  get settings(): Readonly<SaveData> {
    return this.save;
  }

  private get stage(): StageData {
    return STAGES[this.stageIndex];
  }

  /* ---------- 판 시작·끝 ---------- */

  /** 스테이지의 맵·분위기·단어 묶음을 준비한다. 같은 맵이면 다시 만들지 않는다 */
  private loadStage(index: number): void {
    this.stageIndex = index;
    const st = this.stage;
    this.pools = stageWords(WORDS, STAGES, index);
    this.mode = 'field';
    this.clearNpcs();
    if (st.map === this.mapName) return;
    if (this.mapRoot) disposeMap(this.scene, this.mapRoot);
    this.map = getMap(st.map);
    this.mapName = st.map;
    this.grid = new Grid(this.map.rows);
    const theme = getTheme(this.map.theme);
    applyTheme(this.scene, theme);
    this.mapRoot = buildMap(this.scene, this.grid, theme);
    if (this.player) this.player.grid = this.grid;
  }

  reset(): void {
    this.goblins.forEach((g) => g.dispose());
    this.goblins = [];
    this.particles.clear();
    this.shockwaves.clear();
    this.timeFx.reset();
    this.cam.resetFx();
    this.timers.clear();
    this.endQuiz();
    const pr = this.save.profile;
    this.fx = gearEffects(SHOP, this.save.inventory);
    this.charmsLeft = this.fx.charms;
    const base = heroStatsFor(pr.level, pr.exp);
    this.player.reset(this.map.start, { ...base, attack: base.attack + this.fx.attack, gold: pr.gold });
    this.ending = false;
    this.atkBuffed = false;
    this.stageQuizTime = 0;
    this.cam.snapTo(this.player.x, this.player.z);
    this.run = { quiz: 0, correct: 0, wrong: new Map(), learned: new Map(), kills: 0, start: performance.now() };
    this.result = null;
    this.hurtCount = 0;
    this.waves = new WaveProgress(this.stage.waves.length);
    // 첫 전투 힌트는 한 번도 해 보지 않은 사람에게만
    el('hint').hidden = pr.runs > 0;
    this.held = [];
    this.queued = null;
    this.spawnWave(0, true);
    this.updateHud();
    this.drawDailyBars();
  }

  /** 시작 화면의 "모험 시작": 처음이면 바로 1스테이지, 깬 스테이지가 있으면 스테이지 목록 */
  start(): void {
    unlockAudio();
    if (!this.save.stages[STAGES[0].id]) this.play(0);
    else this.enterVillage();
  }

  openSelect(): void {
    this.select.open(STAGES, this.save.stages, this.save.dex, WORDS);
  }

  /** 결과 화면의 큰 버튼: 처음 1스테이지를 깼으면 마을로, 이겼고 다음 스테이지가 있으면 다음, 아니면 같은 스테이지 다시 */
  retry(): void {
    if (this.result === 'win' && (!this.seen('village') || this.ending)) {
      this.enterVillage();
      return;
    }
    const next = this.result === 'win' && isUnlocked(STAGES, this.save.stages, this.stageIndex + 1) ? this.stageIndex + 1 : this.stageIndex;
    this.play(next);
  }

  /** 결과 화면 → 마을 (아직 마을을 모르면 시작 화면) */
  toMenu(): void {
    hideEnd();
    if (this.save.stages[STAGES[0].id]) this.enterVillage();
    else {
      this.updateStartNote();
      showStart();
    }
  }

  /* ---------- 마을 ---------- */

  private clearNpcs(): void {
    this.npcs.forEach((n) => n.label.remove());
    this.npcs = [];
    this.dialog.reset();
  }

  /** 마을 맵·건물·NPC를 만든다 (복구 상태는 지금 도감 수 기준) */
  private loadVillage(collectedOverride?: number): void {
    this.mode = 'village';
    this.clearNpcs();
    if (this.mapRoot) disposeMap(this.scene, this.mapRoot);
    this.map = VILLAGE;
    this.mapName = VILLAGE_MAP;
    this.grid = new Grid(VILLAGE.rows);
    const theme = getTheme(VILLAGE.theme);
    applyTheme(this.scene, theme);
    this.mapRoot = buildMap(this.scene, this.grid, theme);
    const collected = collectedOverride ?? dexProgress(this.save.dex, WORDS).collected;
    const buildings = buildVillageProps(this.grid, VILLAGE, builtSet(VILLAGE.buildings, collected));
    mergeByMaterial(buildings);
    this.mapRoot.add(buildings);
    for (const npc of activeNpcs(VILLAGE, collected)) {
      const m = makeNpc(npc.look);
      m.group.position.set(this.grid.worldX(npc.at.c), 0, this.grid.worldZ(npc.at.r));
      this.mapRoot.add(m.group);
      const label = document.createElement('div');
      label.className = 'npcname';
      label.textContent = npc.name;
      el('labels').appendChild(label);
      const entry = { npc, group: m.group, label, rig: null as RiggedModel | null };
      this.npcs.push(entry);
      // KayKit 캐릭터가 있는 NPC는 불러오면 임시 도형과 바꾼다
      const file = NPC_RIGS[npc.look];
      if (file)
        void loadRigged(file, { height: 1.25, hide: NPC_HIDE }).then((rig) => {
          if (!rig || !this.npcs.includes(entry)) return;
          entry.group.children.forEach((c) => (c.visible = false));
          entry.group.add(rig.root);
          rig.play('Idle', { fade: 0 });
          rig.mixer.setTime(npc.at.c * 0.37); // 다 같이 똑같이 움직이지 않게
          entry.rig = rig;
        });
    }
    if (this.player) this.player.grid = this.grid;
  }

  private placeInVillage(): void {
    const pr = this.save.profile;
    const base = heroStatsFor(pr.level, pr.exp);
    this.fx = gearEffects(SHOP, this.save.inventory);
    this.player.reset(VILLAGE.start, { ...base, attack: base.attack + this.fx.attack, gold: pr.gold });
    this.cam.snapTo(this.player.x, this.player.z);
    this.goblins.forEach((g) => g.dispose());
    this.goblins = [];
    this.shockwaves.clear();
    this.timeFx.reset();
    this.cam.resetFx();
    this.timers.clear();
    this.endQuiz();
    this.result = null;
    this.held = [];
    this.queued = null;
    Hud.setPlace('씬짜오 마을');
    this.drawDailyBars();
    el('hint').hidden = true;
    this.updateHud();
  }

  /** 마을로 돌아오기: 새로 지어진 건물이 있으면 알려준다. 처음 오면 도착 컷 */
  enterVillage(): void {
    unlockAudio();
    hideStart();
    hideEnd();
    this.select.close();
    this.loadVillage();
    this.placeInVillage();
    this.askedThisVisit.clear();
    this.running = true;
    playMusic('village');
    const collected = dexProgress(this.save.dex, WORDS).collected;
    const built = VILLAGE.buildings.filter((b) => collected >= b.need);
    const fresh = this.seen('village') ? built.slice(this.save.villageBuilt) : [];
    this.save.villageBuilt = built.length;
    persist(this.save);
    this.story('village', () => {
      if (fresh.length) {
        banner(fresh.map((b) => b.name).join(' · '), '다시 지어졌어요!');
        sfx.level();
      } else banner('씬짜오 마을', `모은 단어 ${collected}개`);
    });
  }

  /** 마을에서 부딪힌 곳. true면 처리함 (움직이지 않음) */
  private villageTouch(dir: Dir): boolean {
    const d = DIRS[dir];
    const c = this.player.c + d.dc;
    const r = this.player.r + d.dr;
    const t = touchAt(VILLAGE, this.npcs.map((n) => n.npc), c, r);
    if (t.kind === 'none') return false;
    this.player.face = faceAngle(d.dc, d.dr);
    this.held = [];
    this.queued = null;
    if (t.kind === 'gate') {
      sfx.bump();
      this.openSelect();
    } else if (t.kind === 'npc') this.talk(t.npc);
    else if (t.kind === 'building') {
      const collected = dexProgress(this.save.dex, WORDS).collected;
      if (collected < t.building.need) {
        this.dialog.say(t.building.name, '…무너져 있다.', `단어 ${t.building.need}개를 모으면 다시 지어져요 (지금 ${collected}개)`);
      } else {
        this.player.wallBump();
        sfx.bump();
      }
    }
    return true;
  }

  private talk(npc: Npc): void {
    sfx.bump();
    const n = this.npcs.find((x) => x.npc === npc);
    if (n) {
      n.group.rotation.y = Math.atan2(this.player.x - n.group.position.x, this.player.z - n.group.position.z);
      if (n.rig) {
        n.rig.play('Interact', { once: true, fade: 0.1, restart: true });
        setTimeout(() => n.rig?.play('Idle', { fade: 0.3 }), 1200);
      }
    }
    const collected = dexProgress(this.save.dex, WORDS).collected;
    switch (npc.role) {
      case 'lord': {
        const next = nextBuilding(VILLAGE.buildings, collected);
        const stage = STAGES[lastUnlocked(STAGES, this.save.stages)];
        const sub = next
          ? `단어 ${next.need - collected}개를 더 모으면 ${next.name}이(가) 다시 지어질 것이오. 다음 목적지: ${stage.name}`
          : `마을이 완전히 살아났소! 다음 목적지: ${stage.name}`;
        this.dialog.say(npc.name, 'Chào dũng sĩ!', `용사여, 반갑소. ${sub}`);
        this.askedThisVisit.add(npc.id);
        break;
      }
      case 'food':
        this.shop.open(SHOP.filter((x) => x.shop === 'food'), this.save.inventory, this.save.profile.gold, '반미 가게', 'Bánh mì nóng đây! · 따끈한 반미 있어요!');
        break;
      case 'gear':
        this.shop.open(SHOP.filter((x) => x.shop === 'gear'), this.save.inventory, this.save.profile.gold, '대장간', 'Kiếm tốt lắm đây! · 좋은 검 있어요!');
        break;
      case 'book':
        this.openBook();
        break;
      case 'question':
        this.askVillager(npc);
        break;
    }
    this.refreshNpcLabels();
  }

  /** 마을 사람 질문: 베트남 사람이 외국인에게 자주 묻는 말. ←/→로 대답 */
  private askVillager(npc: Npc): void {
    if (this.askedThisVisit.has(npc.id)) {
      this.dialog.say(npc.name, 'Hẹn gặp lại!', '또 봐요!');
      return;
    }
    const asked = new Set<string>();
    const q = pickVillageQuestion(VILLAGE.questions, asked, this.rng);
    const { options, answer } = questionOptions(q, this.rng);
    this.talkAnswer = answer;
    speak(q.q);
    this.dialog.ask(npc.name, q.q, q.ko, options, (side) => {
      this.askedThisVisit.add(npc.id);
      this.talkAnswer = null;
      this.dialog.mark(answer, side);
      const ok = side === answer;
      speak(q.right);
      if (ok) {
        sfx.good();
        sfx.coin();
        const gold = CONFIG.village.answerGold;
        this.save.profile = { ...this.save.profile, gold: this.save.profile.gold + gold };
        this.player.stats.gold = this.save.profile.gold;
        this.countCorrect();
        persist(this.save);
        this.updateHud();
        this.drawDailyBars();
        setTimeout(() => this.dialog.say(npc.name, 'Giỏi quá!', `잘하네요! "${q.right}" = ${q.rightKo} · +${fmtDong(gold)}`), 700);
      } else {
        sfx.bad();
        setTimeout(() => this.dialog.say(npc.name, q.right, `이렇게 대답하면 돼요: ${q.rightKo}`), 700);
      }
      this.refreshNpcLabels();
    });
  }

  /** 아직 이야기할 게 있는 NPC 이름표에 "!" */
  private refreshNpcLabels(): void {
    for (const n of this.npcs) {
      const fresh = (n.npc.role === 'question' || n.npc.role === 'lord') && !this.askedThisVisit.has(n.npc.id);
      n.label.classList.toggle('new', fresh);
    }
  }

  /** index번 스테이지를 처음부터 */
  play(index: number): void {
    if (!isUnlocked(STAGES, this.save.stages, index)) return;
    unlockAudio();
    hideStart();
    hideEnd();
    this.select.close();
    this.shop.close();
    this.loadStage(index);
    this.reset();
    this.beginRun();
    Hud.setPlace(null);
    playMusic(index === STAGES.length - 1 ? 'boss' : 'field');
    banner(this.stage.name, '웨이브 1 · ' + this.stage.waves[0].label);
    // 에그커피가 있으면 판을 시작하면서 한 잔
    const coffee = SHOP.find((x) => x.stageQuizTime);
    if (coffee && (this.save.inventory.items[coffee.id] ?? 0) > 0) {
      this.save.inventory = useItem(coffee.id, this.save.inventory).inv;
      this.stageQuizTime = coffee.stageQuizTime ?? 0;
      persist(this.save);
      this.timers.after(1.6, () => toast(`<b>${esc(coffee.vi)}</b> 한 잔! 이번 판 퀴즈 +${this.stageQuizTime}초`, 'level'));
    }
  }

  private beginRun(): void {
    this.running = true;
    this.save.profile = { ...this.save.profile, runs: this.save.profile.runs + 1 };
    persist(this.save);
  }

  private finish(win: boolean): void {
    this.running = false;
    playMusic(null);
    this.result = win ? 'win' : 'lose';
    const seconds = Math.round((performance.now() - this.run.start) / 1000);
    const isLast = this.stageIndex === STAGES.length - 1;
    this.ending = win && isLast;
    this.save.profile = {
      ...this.save.profile,
      seconds: this.save.profile.seconds + seconds,
      clears: this.save.profile.clears + (win ? 1 : 0),
      ended: this.save.profile.ended + (this.ending ? 1 : 0),
    };
    if (win) this.save.stages = recordClear(this.save.stages, this.stage.id, seconds);
    persist(this.save);
    const summary: EndSummary = {
      win,
      stageName: this.stage.name,
      hasNext: win && this.stageIndex + 1 < STAGES.length,
      isLast,
      ending: this.ending
        ? {
            totalSeconds: this.save.profile.seconds,
            collected: dexProgress(this.save.dex, WORDS).collected,
            totalWords: WORDS.length,
            accuracy: this.save.profile.answered ? Math.round((this.save.profile.correct / this.save.profile.answered) * 100) : 0,
            kills: this.save.profile.kills,
          }
        : null,
      correct: this.run.correct,
      total: this.run.quiz,
      kills: this.run.kills,
      level: this.player.stats.level,
      seconds,
      wrongWords: this.run.wrong,
      learnedWords: this.run.learned,
    };
    const show = () => {
      this.drawDailyBars();
      showEnd(summary);
      if (win && !this.seen('village')) el('btnRetry').textContent = '마을로 ▶';
      if (this.ending) el('btnRetry').textContent = '마을로 돌아가기';
      el('btnMenu').textContent = this.save.stages[STAGES[0].id] ? '마을' : '처음';
      // 큰 버튼이 이미 마을로 가면 "마을" 버튼을 또 보여주지 않는다
      const bigGoesToVillage = this.ending || (win && !this.seen('village'));
      el('btnMenu').hidden = bigGoesToVillage;
      el('btnMenu').parentElement!.classList.toggle('two', bigGoesToVillage);
    };
    if (this.ending) this.story('ending', show);
    else show();
  }

  /* ---------- 설정 ---------- */

  togglePixel(): void {
    this.save.pixel = !this.save.pixel;
    persist(this.save);
  }

  toggleMusic(): void {
    this.save.music = !this.save.music;
    setMusicEnabled(this.save.sound && this.save.music);
    persist(this.save);
  }

  toggleSound(): void {
    this.save.sound = !this.save.sound;
    setSoundEnabled(this.save.sound);
    setVoiceEnabled(this.save.sound);
    setMusicEnabled(this.save.sound && this.save.music);
    persist(this.save);
    unlockAudio();
  }

  private updateStartNote(): void {
    this.drawDailyBars();
    const wc = Object.keys(this.save.wrong).length;
    setStartNote(wc ? `지난번에 틀린 단어 ${wc}개가 더 자주 나와요.` : '');
    const { collected, total } = dexProgress(this.save.dex, WORDS);
    setStartProfile(this.save.profile, collected, total, wc, fmtDong(this.save.profile.gold));
  }

  /* ---------- 오늘의 목표 ---------- */

  private dailyNow() {
    return dailyView(this.save.daily, dayKey(new Date()), CONFIG.daily.goal);
  }

  /** 시작 화면·마을·결과 화면의 막대. 처음 하는 사람에게는 안 보여준다. 판 중에는 숨김 (전투에 집중) */
  private drawDailyBars(): void {
    const d = this.dailyNow();
    const known = this.save.profile.runs > 0;
    drawDaily('startDaily', d, known);
    drawDaily('endDaily', d, known);
    // 처음 1스테이지를 깨기 전에는 마을이 없으므로, 마을에 있을 때만
    drawDaily('hudDaily', d, this.mode === 'village');
  }

  /** 정답 하나를 오늘의 목표에 더한다. 막 채웠으면 골드를 준다 (퀴즈·마을 질문 공통) */
  private countCorrect(): void {
    const c = CONFIG.daily;
    const r = recordCorrect(this.save.daily, dayKey(new Date()), c.goal);
    this.save.daily = r.state;
    if (!r.justDone) return;
    const gold = dailyReward(r.state.streak, c.reward, c.streakBonus, c.maxBonusDays);
    this.save.profile = { ...this.save.profile, gold: this.save.profile.gold + gold };
    this.player.stats.gold += gold;
    this.timers.after(0.9, () => {
      toast(`<b>오늘의 목표 달성!</b> +${fmtDong(gold)}${r.state.streak > 1 ? ` · ${r.state.streak}일 연속` : ''}`, 'level');
      sfx.coin();
      this.updateHud();
    });
  }

  /* ---------- 타격 연출 (연출 스위치) ---------- */

  private fxo(id: FxId): boolean {
    return fxOn(this.save.fxOff, id);
  }

  private applyFx(): void {
    setPitchVary(this.fxo('pitch') ? CONFIG.feel.sfxPitchVary : 0);
  }

  toggleEffect(id: FxId): void {
    this.save.fxOff = toggleFx(this.save.fxOff, id);
    this.applyFx();
    persist(this.save);
  }

  setAllEffects(on: boolean): void {
    this.save.fxOff = setAllFx(on);
    this.applyFx();
    persist(this.save);
  }

  openDevMenu(): void {
    this.save.devOpen = true;
    persist(this.save);
  }

  private shake(amount: number): void {
    if (this.fxo('shake') && amount > 0) this.cam.shake(amount);
  }

  private buzz(pattern: readonly number[]): void {
    if (this.fxo('vibrate')) vibrate(pattern);
  }

  private wave(x: number, z: number, radius: number, color: string): void {
    if (this.fxo('shockwave')) this.shockwaves.add(x, z, radius, CONFIG.feel.shockwaveTime, color);
  }

  /** 몬스터의 공격이 떨어진 순간: 고블린 왕은 빗나가도 땅이 울린다 */
  private onStrike(g: Goblin, pattern: AttackPattern): void {
    if (g.kind !== 'king') return;
    this.shake(CONFIG.feel.shakeBossAttack);
    if (pattern === 'slam') this.wave(g.x, g.z, CONFIG.feel.shockwaveSlam, '#ffe2a8');
  }

  openBook(): void {
    this.book.open(WORDS, this.save.dex, this.save.wrong);
  }

  /** 상점 열기. food: 반미 가게, gear: 대장간 */
  openShop(kind: 'food' | 'gear'): void {
    this.shop.open(SHOP.filter((x) => x.shop === kind), this.save.inventory, this.save.profile.gold, kind === 'food' ? '반미 가게' : '대장간');
  }

  private buyItem(id: string): void {
    const item = SHOP.find((x) => x.id === id);
    if (!item) return;
    const r = buy(item, this.save.inventory, this.save.profile.gold);
    if (!r.ok) return;
    this.save.inventory = r.inv;
    this.save.profile = { ...this.save.profile, gold: r.gold };
    // 처음 산 음식 이름은 단어 도감에 들어간다
    if (item.kind === 'consumable' && WORDS.some((w) => w.vi === item.vi)) {
      const rec = recordAnswer(this.save.dex, item.vi, true, Date.now());
      this.save.dex = rec.dex;
      if (rec.newlyLearned) toast(`<b>도감에 새 단어!</b> ${esc(item.vi)} = ${esc(item.ko)}`, 'level');
    }
    persist(this.save);
    sfx.coin();
    speak(item.vi);
    this.shop.render(this.save.inventory, this.save.profile.gold);
    this.updateStartNote();
    this.player.stats.gold = r.gold;
    this.updateHud();
  }

  /** 음식 먹기 (먹기 버튼, E, 스페이스): HP가 많이 빠졌으면 큰 회복 음식부터. 판 중에만, HP가 가득이면 아낀다 */
  eat(): void {
    const p = this.player;
    if (!this.running || this.mode !== 'field' || p.stats.hp <= 0 || p.stats.hp >= p.stats.maxHp) return;
    const item = pickFood(SHOP, this.save.inventory, p.stats.hp / p.stats.maxHp);
    if (!item) return;
    const r = useItem(item.id, this.save.inventory);
    if (!r.ok) return;
    this.save.inventory = r.inv;
    persist(this.save);
    const heal = Math.round(p.stats.maxHp * (item.heal ?? 0));
    p.stats.hp = Math.min(p.stats.maxHp, p.stats.hp + heal);
    floatText(this.cam.camera, p.x, 1.4, p.z, '+' + heal, 'heal');
    if (item.atkBuff && !this.atkBuffed) {
      this.atkBuffed = true;
      p.stats.attack = Math.round(p.stats.attack * (1 + item.atkBuff));
      toast(`<b>${esc(item.vi)}</b> 힘이 난다! 공격력 ${p.stats.attack}`, 'level');
    } else toast(`<b>${esc(item.vi)}</b> 냠냠`, 'good');
    sfx.good();
    this.updateHud();
  }

  /* ---------- 입력 ---------- */

  /** 방향 입력이 지금은 "답"인가 (퀴즈, 마을 사람 질문) → 미끄러지는 터치는 답으로 치지 않는다 */
  get answering(): boolean {
    return !!this.quiz || this.dialog.asking;
  }

  press(dir: Dir): void {
    if (this.cartoon.isOpen) {
      this.cartoon.next();
      return;
    }
    if (this.dialog.isOpen) {
      this.dialog.key(dir);
      return;
    }
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
    const w = this.stage.waves[index];
    w.enemies.forEach((k) => this.spawnGoblin(k));
    Hud.setWave(index, this.stage.waves.length);
    if (!silent) banner('웨이브 ' + (index + 1), w.label);
  }

  private spawnGoblin(kind: EnemyKind): void {
    const occupied: Cell[] = [this.player.cell, ...this.goblins.filter((g) => g.alive).map((g) => ({ c: g.c, r: g.r }))];
    const ai = CONFIG.goblinAi;
    const cell = findSpawnCell(this.grid, this.map.spawnArea, occupied, this.player.cell, ai.spawnMinDistance, this.rng, ai.spawnMaxTries);
    const stats = scaleEnemy(CONFIG.enemies[kind], this.stage.power, this.stage.damage);
    this.goblins.push(new Goblin(kind, cell.c, cell.r, this.grid, this.scene, this.rng, stats));
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
    if (this.mode === 'village' && this.villageTouch(dir)) return true;
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
    const hpBefore = g.hp;
    g.hp = applyDamage(g.hp, damage);
    g.takeHit(DIRS[dir], { flash: this.fxo('flash'), knockback: this.fxo('knockback'), squash: this.fxo('squash') });
    if (this.fxo('numbers')) floatText(this.cam.camera, g.x, 1.3, g.z, (crit ? '크리티컬 ' : '') + damage, crit ? 'crit' : '');
    if (crit) sfx.crit();
    else sfx.hit();
    if (this.fxo('hitStop')) this.timeFx.hitStop(crit ? CONFIG.feel.hitStopCrit : CONFIG.feel.hitStop);
    if (this.fxo('sparks')) this.particles.spark(g.x, g.z, crit ? CONFIG.feel.hitSparks * 2 : CONFIG.feel.hitSparks, crit ? '#ffdf6b' : '#ffffff');
    this.shake(crit ? CONFIG.feel.shakeCrit : CONFIG.feel.shakeHit);
    if (g.hp <= 0) this.startQuiz(g, false);
    else if (g.stats.phases.length) {
      const ph = crossedPhase(hpBefore, g.hp, g.maxHp, g.stats.phases, g.phasesDone);
      if (ph >= 0) {
        g.phasesDone = ph + 1;
        this.startQuiz(g, true);
      }
    }
  }

  private hurtPlayer(raw: number): void {
    const p = this.player;
    const damage = guardedDamage(raw, this.fx.guard);
    p.stats.hp = applyDamage(p.stats.hp, damage);
    if (p.stats.hp > 0) p.hurt();
    else p.die();
    this.hurtCount++;
    if (this.fxo('numbers')) floatText(this.cam.camera, p.x, 1.3, p.z, '-' + damage, 'hurtn');
    sfx.hurt();
    this.shake(CONFIG.feel.shakeHurt);
    this.buzz(CONFIG.feel.vibrateHurt);
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

  private startQuiz(g: Goblin, phase: boolean): void {
    g.daze();
    this.timeFx.cancelSlowMo(); // 퀴즈 중 다른 몬스터 속도는 퀴즈 규칙(0.25배)만 적용
    this.held = [];
    this.queued = null;
    const limit = CONFIG.quiz.timeLimit + this.fx.quizTime + this.stageQuizTime;
    this.quiz = {
      goblin: g,
      phase,
      limit,
      timeLeft: limit,
      armedAt: performance.now() + CONFIG.quiz.inputGuard * 1000,
      locked: false,
      question: this.newQuestion(g, phase),
    };
    this.bubble.setPhase(phase);
    this.showQuestion();
    this.bubble.setTeach(!this.save.answeredQuiz);
    this.bubble.show();
    sfx.quiz();
  }

  /** 지역 보스의 마지막 문제는 어려운 문제 (성조 구별이 가능하면 성조 문제) */
  private newQuestion(g: Goblin, phase: boolean): Question {
    const pool = pickPool(this.pools, this.rng, CONFIG.quiz.olderChance);
    const hard = !phase && g.stats.phases.length > 0 && g.need === 1;
    return makeQuestion(hard ? WORDS : pool, this.save.wrong, this.rng, CONFIG.quiz.reviewChance, hard ? 1 : CONFIG.quiz.toneChance);
  }

  private showQuestion(): void {
    if (!this.quiz) return;
    this.bubble.setQuestion(this.quiz.question, this.quiz.phase ? 1 : this.quiz.goblin.need, this.quiz.goblin.boss);
  }

  private nextQuestion(): void {
    if (!this.quiz) return;
    this.quiz.question = this.newQuestion(this.quiz.goblin, this.quiz.phase);
    this.quiz.timeLeft = this.quiz.limit;
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
    const rec = recordAnswer(this.save.dex, q.word.vi, ok, Date.now());
    this.save.dex = rec.dex;
    if (rec.newlyLearned) this.run.learned.set(q.word.vi, q.word.ko);
    const pr = this.save.profile;
    this.save.profile = { ...pr, answered: pr.answered + 1, correct: pr.correct + (ok ? 1 : 0) };
    if (ok) this.countCorrect();
    if (side !== null) {
      // 시간 초과가 아니라 직접 답했으면, 답하는 법을 안 것으로 보고 다음부터 깜빡이지 않음
      this.save.answeredQuiz = true;
      this.bubble.setTeach(false);
    }
    persist(this.save);
    speak(q.word.vi);
    const outcome = resolveQuiz(g.need, ok, g.maxHp, g.stats.quizCount);
    const pair = `${esc(q.word.vi)} = ${esc(q.word.ko)}`;

    if (quiz.phase) {
      // 지역 보스 HP 단계 퀴즈: 맞히면 추가 피해, 틀리면 조금 회복. 어느 쪽이든 전투 재개
      if (ok) {
        this.run.correct++;
        sfx.good();
        toast(`<b>정답!</b> ${pair} · 왕에게 큰 피해`, 'good');
      } else {
        this.run.wrong.set(q.word.vi, q.word.ko);
        sfx.bad();
        toast(`${side === null ? '시간 초과' : '오답'} · 정답은 <b>${esc(q.answer)}</b>`, 'bad');
      }
      this.timers.after(CONFIG.quiz.recoverDelay, () => {
        const hp = ok ? phaseBonusHp(g.hp, g.maxHp, CONFIG.quiz.phaseBonus) : Math.min(g.maxHp, g.hp + recoverHp(g.maxHp));
        floatText(this.cam.camera, g.x, 1.5 * g.stats.scale, g.z, ok ? '-' + (g.hp - hp) : '+' + (hp - g.hp), ok ? 'crit' : 'heal');
        if (ok) this.shake(CONFIG.feel.shakeCrit);
        g.recover(hp, g.need);
        this.endQuiz();
      });
      return;
    }

    if (outcome.kind === 'recover' && this.charmsLeft > 0) {
      // 행운 부적: 틀려도 적이 회복하지 않고 바로 다음 문제 (오답노트에는 들어감)
      this.charmsLeft--;
      this.run.wrong.set(q.word.vi, q.word.ko);
      sfx.bad();
      toast(`부적이 지켜줬어요 · 정답은 <b>${esc(q.answer)}</b>`, 'bad');
      this.timers.after(CONFIG.quiz.nextQuestionDelay + 0.4, () => {
        if (this.quiz && this.quiz.goblin === g) this.nextQuestion();
      });
      return;
    }

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
    sfx.kill();
    g.kill();
    this.run.kills++;
    if (this.fxo('debris')) this.particles.burst(g.x, g.z, g.boss ? 26 : 14, MONSTER_COLOR[g.kind]);
    this.shake(g.boss ? CONFIG.feel.shakeBossKill : CONFIG.feel.shakeKill);
    if (this.fxo('hitStop')) this.timeFx.hitStop(CONFIG.feel.hitStopKill);
    // 말로 끝낸 순간을 가장 크게: 느려지고, 가까이 보여 준다
    const slow = g.boss ? CONFIG.feel.slowMoBossTime : CONFIG.feel.slowMoTime;
    if (this.fxo('slowMo')) this.timeFx.slowMo(slow, CONFIG.feel.slowMoScale);
    if (this.fxo('zoom')) this.cam.punch(CONFIG.feel.finisherZoom, slow);
    if (g.boss) this.wave(g.x, g.z, g.kind === 'king' ? CONFIG.feel.shockwaveKingKill : CONFIG.feel.shockwaveBossKill, '#ffd45e');
    this.buzz(g.boss ? CONFIG.feel.vibrateBossKill : CONFIG.feel.vibrateKill);
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
    this.save.profile = { ...this.save.profile, level: p.stats.level, exp: p.stats.exp, gold: p.stats.gold, kills: this.save.profile.kills + 1 };
    persist(this.save);
    this.updateHud();
  }

  private endQuiz(): void {
    this.quiz = null;
    this.bubble.hide();
  }

  /* ---------- 매 프레임 ---------- */

  /** 설정 창이 떠 있으면 게임을 멈춘다 */
  paused = false;

  /** 진행 초기화 (설정은 남김). 부른 쪽에서 페이지를 새로 연다 */
  resetProgress(): void {
    this.save = clearProgress(this.save);
    persist(this.save);
  }

  update(dt: number, nowMs: number): void {
    if (this.paused) return;
    this.timers.update(dt);
    const p = this.player;

    p.tick(dt);
    if (this.running && !this.quiz && !this.dialog.isOpen && p.ready && p.stats.hp > 0) {
      const dir = this.queued ?? this.held[this.held.length - 1];
      if (dir && this.tryAct(dir)) this.queued = null;
    }

    // 연출 시간: 히트스톱·슬로 모션은 몬스터와 보이는 동작에만. 위의 플레이어, 아래의 퀴즈 제한시간은 실제 시간
    const { world, anim } = this.timeFx.step(dt);
    const ctx = {
      running: this.running,
      player: p.cell,
      playerHp: p.stats.hp,
      isFree: (c: number, r: number, self: Goblin) => this.freeFor(c, r, self),
      onHitPlayer: (damage: number) => this.hurtPlayer(damage),
      onStrike: (g: Goblin, pattern: AttackPattern) => this.onStrike(g, pattern),
      nowMs,
    };
    for (const g of this.goblins) {
      // 퀴즈 중에는 퀴즈 대상이 아닌 고블린만 0.25배속
      const slow = this.quiz && this.quiz.goblin !== g ? CONFIG.quiz.othersSpeed : 1;
      ctx.playerHp = p.stats.hp;
      ctx.running = this.running;
      g.update(world * slow, anim * slow, ctx);
    }
    this.goblins = this.goblins.filter((g) => !g.gone);

    if (this.quiz && !this.quiz.locked && this.running) {
      this.quiz.timeLeft -= dt;
      if (this.quiz.timeLeft <= 0) this.resolve(null);
    }

    p.animate(anim, nowMs);

    if (this.running && this.mode === 'field') {
      const ev = this.waves.check(this.goblins.length);
      if (ev?.kind === 'next') {
        this.timers.after(CONFIG.wave.nextDelay, () => {
          const go = () => {
            this.waves.advance();
            this.spawnWave(ev.index, false);
          };
          const hasKing = this.stage.waves[ev.index].enemies.includes('king');
          if (this.stageIndex === 0 && ev.index === 1) this.story('intro', go);
          else if (hasKing) this.story('king', go);
          else go();
        });
      } else if (ev?.kind === 'clear') {
        this.player.cheer();
        this.timers.after(CONFIG.wave.clearDelay, () => this.finish(true));
      }
    }

    for (const n of this.npcs) {
      if (n.rig) n.rig.update(dt);
      else n.group.position.y = Math.abs(Math.sin(nowMs / 400 + n.npc.at.c)) * 0.03;
    }
    this.particles.update(anim);
    this.shockwaves.update(anim);
    this.cam.update(dt, p);
  }

  /** HTML 라벨(HP 바, 퀴즈 말풍선)을 3D 위치에 맞춘다. 렌더 후에 호출 */
  updateLabels(screenW: number): void {
    const camera = this.cam.camera;
    for (const n of this.npcs) {
      const p = n.group.position;
      const s = toScreen(camera, p.x, 1.45, p.z);
      n.label.style.left = s.x + 'px';
      n.label.style.top = s.y + 'px';
    }
    for (const g of this.goblins) {
      const pos = g.model.group.position;
      const s = toScreen(camera, pos.x, 1.3 * g.stats.scale, pos.z);
      g.hpLabel.update(g.state === 'idle', s.x, s.y, g.hp / g.maxHp);
    }
    if (this.quiz) {
      const g = this.quiz.goblin;
      const pos = g.model.group.position;
      const s = toScreen(camera, pos.x, 1.45 * g.stats.scale, pos.z);
      this.bubble.position(s.x, s.y, screenW);
      this.bubble.setTimeLeft(this.quiz.timeLeft / this.quiz.limit);
    }
  }

  /** 개발용: 다 지어진 마을을 위쪽(성)부터 보여준다 (npm run playtest -- --gallery) */
  debugVillage(row: number): void {
    hideStart();
    if (this.mapName !== VILLAGE_MAP) this.loadVillage(999);
    this.mode = 'village';
    this.placeInVillage();
    this.player.reset({ c: 5, r: row }, { ...this.player.stats });
    this.cam.snapTo(this.player.x, this.player.z);
  }

  /** 개발용: 모든 몬스터를 플레이어 앞에 줄 세워 멈춰 둔다 (모델 확인 스크린샷용, npm run playtest -- --gallery) */
  debugGallery(): void {
    hideStart();
    this.goblins.forEach((g) => g.dispose());
    this.goblins = [];
    const kinds = Object.keys(CONFIG.enemies) as EnemyKind[];
    const { c, r } = this.player.cell;
    const spots = [-2, -4, -6].flatMap((dr) => [-2, 0, 2].map((dc) => ({ c: c + dc, r: r + dr })));
    kinds.forEach((k, i) => {
      const s = spots[i % spots.length];
      this.goblins.push(new Goblin(k, s.c, s.r, this.grid, this.scene, this.rng));
    });
  }

  /** 개발용: 카메라를 확대해 둔다 (몬스터 모양 확인용) */
  debugZoom(zoom: number): void {
    this.cam.punch(zoom, 999);
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
        .map((g) => ({ kind: g.kind, c: g.c, r: g.r, hp: g.hp, maxHp: g.maxHp, state: g.state, boss: g.boss, telegraph: g.telegraphCells })),
      quiz: q
        ? {
            answerSide: q.question.options.indexOf(q.question.answer) as 0 | 1,
            acceptsInput: !q.locked && performance.now() >= q.armedAt,
            locked: q.locked,
            timeLeft: q.timeLeft,
            limit: q.limit,
            prompt: q.question.prompt,
            kind: q.question.kind,
            phase: q.phase,
          }
        : null,
      wave: { index: this.waves.index, total: this.stage.waves.length },
      stage: { index: this.stageIndex, id: this.stage.id, total: STAGES.length, unlocked: lastUnlocked(STAGES, this.save.stages) },
      mode: this.mode,
      cutscene: this.cartoon.isOpen,
      dialog: { open: this.dialog.isOpen, asking: this.dialog.asking, answer: this.talkAnswer },
      npcs: this.npcs.map((n) => ({ id: n.npc.id, c: n.npc.at.c, r: n.npc.at.r, role: n.npc.role })),
      music: musicState(),
      daily: this.dailyNow(),
      fx: { off: [...this.save.fxOff], slowMo: this.timeFx.slowing, shockwaves: this.shockwaves.count },
      overlay: ['shopOv', 'bookOv', 'stageOv', 'endOv', 'startOv'].find((id) => !el(id).hidden) ?? null,
      items: { ...this.save.inventory.items },
      gear: this.save.inventory.gear.slice(),
      ending: this.ending,
      stats: { quiz: this.run.quiz, correct: this.run.correct, kills: this.run.kills, hurt: this.hurtCount, learned: this.run.learned.size },
      profile: { ...this.save.profile, collected: dexProgress(this.save.dex, WORDS).collected },
    };
  }

  private updateHud(): void {
    Hud.update({ ...this.player.stats });
    Hud.setItem(this.save.inventory.items.banhmi ?? 0, this.player.stats.hp / this.player.stats.maxHp);
  }
}
