/**
 * 자동 플레이 점검 (npm run playtest)
 *
 * 개발 서버를 띄우고, 봇이 게임을 플레이한다 (기본: 1스테이지 한 번, --campaign: 끝까지).
 * 결과(클리어 여부, 걸린 시간, 맞은 횟수, 퀴즈 정답률, 오류, 프레임)와 장면별 스크린샷을
 * playtest-output/<날짜시간>/ 에 남긴다. Claude가 스스로 점검할 때 쓰는 도구.
 *
 * 옵션
 *   --runs 3           몇 판 돌릴지 (기본 1)
 *   --wrong-rate 0.2   봇이 퀴즈를 일부러 틀리는 비율 (기본 0.2 = 학습자가 5문제 중 1개 틀림)
 *   --dodge 0.7        빨간 예고를 보고 피하는 확률 (기본 0.7. 1이면 완벽한 고수, 0이면 전혀 안 피함)
 *   --timeout 360      한 판 최대 시간(초). 넘기면 "시간 초과"로 기록 (기본 360)
 *   --headed           브라우저 창을 띄워서 보기
 *   --keep-save        판마다 저장을 지우지 않고 이어서 플레이 (진행 저장 확인용. 기본은 매 판 새로 시작)
 *   --stage 3          3스테이지부터 (앞 스테이지는 깬 것으로, 레벨은 --level 또는 스테이지에 맞는 추정값)
 *   --level 6          시작 레벨 (--stage와 함께)
 *   --campaign         이기면 다음 스테이지, 지면 같은 스테이지를 다시 (마지막 스테이지를 깨거나 --max-plays까지)
 *   --max-plays 20     --campaign에서 최대 몇 번 플레이할지 (기본 20)
 *
 * 처음 한 번은 브라우저 설치가 필요할 수 있다: npx playwright install chromium
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf('--' + name);
  return i >= 0 ? args[i + 1] : def;
};
const RUNS = Number(opt('runs', 1));
const WRONG_RATE = Number(opt('wrong-rate', 0.2));
const DODGE = Number(opt('dodge', 0.7));
const TIMEOUT = Number(opt('timeout', 360)) * 1000;
const HEADED = args.includes('--headed');
const KEEP_SAVE = args.includes('--keep-save');
const START_STAGE = Number(opt('stage', 1));
const START_LEVEL = opt('level', null);
const CAMPAIGN = args.includes('--campaign');
const MAX_PLAYS = Number(opt('max-plays', 20));
const STAGES = JSON.parse(readFileSync('src/data/stages.json', 'utf8'));
/** --stage로 건너뛸 때 시작 레벨 추정 (캠페인 점검 결과로 맞춤) */
const LEVEL_GUESS = [1, 3, 5, 7, 9, 11, 13];

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const OUT = join('playtest-output', stamp);
mkdirSync(OUT, { recursive: true });

/* ---------- 봇의 길찾기 (격자 BFS) ---------- */
const DIRS = [
  { key: 'ArrowUp', dc: 0, dr: -1 },
  { key: 'ArrowDown', dc: 0, dr: 1 },
  { key: 'ArrowLeft', dc: -1, dr: 0 },
  { key: 'ArrowRight', dc: 1, dr: 0 },
];
const k = (c, r) => c + ',' + r;

function firstStep(s, from, goalTest, avoid) {
  const blocked = new Set(s.goblins.map((g) => k(g.c, g.r)));
  const seen = new Set([k(from.c, from.r)]);
  let layer = [];
  for (const d of DIRS) layer.push({ c: from.c + d.dc, r: from.r + d.dr, first: d });
  while (layer.length) {
    const next = [];
    for (const n of layer) {
      const key = k(n.c, n.r);
      if (seen.has(key)) continue;
      seen.add(key);
      if (s.map[n.r]?.[n.c] !== '.' || blocked.has(key) || avoid.has(key)) continue;
      if (goalTest(n)) return n.first;
      for (const d of DIRS) next.push({ c: n.c + d.dc, r: n.r + d.dr, first: n.first });
    }
    layer = next;
  }
  return null;
}

/** 봇이 이번에 누를 키. 우선순위: 퀴즈 → 빨간 칸 피하기 → 고블린 공격 → 고블린에게 다가가기 */
// 예고 하나마다 "이번엔 피할지"를 한 번만 정한다 (사람처럼 가끔 놓치게)
const dodgeChoice = new Map();
function willDodge(key, rng) {
  if (!dodgeChoice.has(key)) dodgeChoice.set(key, rng() < DODGE);
  return dodgeChoice.get(key);
}

function decide(s, rng) {
  if (s.quiz) {
    if (!s.quiz.acceptsInput) return null;
    const side = rng() < WRONG_RATE ? 1 - s.quiz.answerSide : s.quiz.answerSide;
    return side === 0 ? 'ArrowLeft' : 'ArrowRight';
  }
  if (!s.player.ready) return null;
  const danger = new Set(s.goblins.filter((g) => g.telegraph).map((g) => k(g.telegraph.c, g.telegraph.r)));
  // 예고가 끝나면 기록을 지워서, 같은 칸의 다음 예고는 새로 정함
  for (const key of [...dodgeChoice.keys()]) if (!danger.has(key.split('#')[0])) dodgeChoice.delete(key);
  const p = s.player;
  const here = k(p.c, p.r);
  if (danger.has(here) && willDodge(here + '#' + s.stats.hurt, rng)) {
    const d = firstStep(s, p, () => true, danger);
    return d ? d.key : null;
  }
  const targets = s.goblins.filter((g) => g.state === 'idle');
  for (const g of targets) {
    if (Math.abs(g.c - p.c) + Math.abs(g.r - p.r) === 1) return DIRS.find((d) => p.c + d.dc === g.c && p.r + d.dr === g.r).key;
  }
  if (!targets.length) return null;
  const d = firstStep(s, p, (n) => targets.some((g) => Math.abs(g.c - n.c) + Math.abs(g.r - n.r) === 1), danger);
  return d ? d.key : null;
}

/* ---------- 실행 ---------- */
function seeded(seed) {
  let x = seed >>> 0;
  return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296);
}

async function launch() {
  try {
    return await chromium.launch({ headless: !HEADED });
  } catch (e) {
    console.error('\n브라우저를 띄우지 못했어요. 처음이라면 아래 명령을 한 번 실행하세요:\n  npx playwright install chromium\n');
    throw e;
  }
}

const snap = (page) => page.evaluate(() => window.__game.debugSnapshot());

/** 스테이지 한 번 플레이. 결과 화면이 뜰 때까지 (또는 시간 초과) */
async function playStage(page, rng, shot, flags) {
  const t0 = Date.now();
  let s = await snap(page);
  const stage = s.stage;
  let lastWave = 0;
  let minHp = Infinity;
  if (!flags.stageShots.has(stage.index)) await shot(`s${stage.index + 1}-wave1`);
  while (Date.now() - t0 < TIMEOUT) {
    s = await snap(page);
    minHp = Math.min(minHp, s.player.hp);
    if (s.result) break;
    if (s.quiz && !flags.quizShot) {
      await shot('first-quiz');
      flags.quizShot = true;
    }
    if (s.quiz?.kind === 'tone' && !flags.toneShot && s.quiz.acceptsInput) {
      await shot('tone-quiz');
      flags.toneShot = true;
    }
    if (s.wave.index !== lastWave) {
      lastWave = s.wave.index;
      if (!flags.stageShots.has(stage.index) && lastWave === s.wave.total - 1) {
        await page.waitForTimeout(600);
        await shot(`s${stage.index + 1}-wave${lastWave + 1}`);
      }
    }
    const key = decide(s, rng);
    if (key) await page.keyboard.press(key);
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(1500);
  const final = await snap(page);
  if (!flags.stageShots.has(stage.index) || final.result !== 'win') await shot(`s${stage.index + 1}-end-${final.result ?? 'timeout'}`);
  flags.stageShots.add(stage.index);
  return {
    stage: stage.index + 1,
    result: final.result ?? 'timeout',
    seconds: Math.round((Date.now() - t0) / 1000),
    waveReached: `${final.wave.index + 1} / ${final.wave.total}`,
    level: final.player.level,
    kills: final.stats.kills,
    quiz: `${final.stats.correct} / ${final.stats.quiz}`,
    learned: final.stats.learned,
    hurt: final.stats.hurt,
    minHpRatio: Math.round((Math.max(0, minHp) / final.player.maxHp) * 100) + '%',
  };
}

async function playOnce(context, url, run) {
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const shots = [];
  const shot = async (name) => {
    const file = `run${run}-${String(shots.length + 1).padStart(2, '0')}-${name}.png`;
    await page.screenshot({ path: join(OUT, file) });
    shots.push(file);
  };

  await page.goto(url);
  await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 30000 });
  if (!KEEP_SAVE || run === 1) {
    const level = Number(START_LEVEL ?? LEVEL_GUESS[START_STAGE - 1] ?? 1);
    const stages = Object.fromEntries(STAGES.slice(0, START_STAGE - 1).map((st) => [st.id, { clears: 1, best: 0 }]));
    await page.evaluate(
      ({ level, stages, skip }) => {
        try {
          localStorage.clear();
          if (skip) localStorage.setItem('xinchao-3d-v1', JSON.stringify({ answeredQuiz: true, stages, profile: { level, exp: 0, gold: 0, runs: 1 } }));
        } catch {}
      },
      { level, stages, skip: START_STAGE > 1 },
    );
    await page.reload();
    await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 30000 });
  }
  const before = (await snap(page)).profile;
  const webgl = !(await page.isVisible('#err'));
  await shot('start');
  if (!webgl) {
    await page.close();
    return { run, rows: [{ result: 'webgl-error' }], errors, shots };
  }
  await page.click('#btnStart');
  await page.waitForTimeout(300);
  if (await page.isVisible('#stageOv')) {
    await shot('stage-select');
    const cards = page.locator('#stageList .stage:not(.locked)');
    const count = await cards.count();
    await cards.nth(KEEP_SAVE && run > 1 ? count - 1 : Math.min(START_STAGE, count) - 1).click();
  }
  await page.waitForTimeout(1200);

  // 프레임 측정 (2초)
  const fps = await page.evaluate(
    () => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else res(Math.round(n / 2)); }; requestAnimationFrame(f); }),
  );
  const gpu = await page.evaluate(() => {
    try {
      const gl = document.createElement('canvas').getContext('webgl2');
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      return String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
    } catch { return '?'; }
  });

  const rng = seeded(1234 + run);
  const flags = { quizShot: false, toneShot: false, stageShots: new Set() };
  const rows = [];
  const tStart = Date.now();
  for (let n = 0; n < (CAMPAIGN ? MAX_PLAYS : 1); n++) {
    const row = await playStage(page, rng, shot, flags);
    rows.push(row);
    console.log(`  스테이지 ${row.stage}: ${label[row.result] ?? row.result}, ${row.seconds}초, 웨이브 ${row.waveReached}, Lv ${row.level}, 맞음 ${row.hurt}회`);
    if (!CAMPAIGN || row.result === 'timeout') break;
    if (row.result === 'win' && row.stage === STAGES.length) break;
    await page.click('#btnRetry');
    await page.waitForTimeout(1200);
  }
  const totalSeconds = Math.round((Date.now() - tStart) / 1000);
  if (await page.isVisible('#btnBook2')) {
    await page.click('#btnBook2');
    await page.waitForTimeout(300);
    await page.click('#tabDex');
    await shot('book-dex');
    await page.click('#tabWrong');
    await shot('book-wrong');
    await page.click('#btnBookClose');
  }
  if (CAMPAIGN && (await page.isVisible('#btnMenu'))) {
    await page.click('#btnMenu');
    await page.click('#btnStart');
    await page.waitForTimeout(300);
    await shot('stage-select-after');
  }
  const final = await snap(page);
  await page.close();
  return { run, rows, totalSeconds, profileBefore: before, profileAfter: final.profile, fps, gpu, errors, shots };
}

const label = { win: '클리어', lose: '쓰러짐', timeout: '시간 초과', 'webgl-error': 'WebGL 오류' };
const server = await createServer({ logLevel: 'error', server: { port: 5199, strictPort: false } });
await server.listen();
const url = server.resolvedUrls.local[0];
const browser = await launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const results = [];
try {
  for (let i = 1; i <= RUNS; i++) {
    console.log(`플레이 ${i}/${RUNS} ...`);
    const r = await playOnce(context, url, i);
    console.log(`  → ${r.rows.length}번 플레이, ${r.totalSeconds ?? '-'}초, 오류 ${r.errors.length}개`);
    results.push(r);
  }
} finally {
  await browser.close();
  await server.close();
}

const allRows = results.flatMap((r) => r.rows.map((row) => ({ run: r.run, ...row })));
const md = [
  `# 자동 플레이 점검 ${stamp}`,
  '',
  `봇 설정: 퀴즈 오답률 ${WRONG_RATE * 100}%, 예고 피하는 확률 ${DODGE * 100}%, 한 판 최대 ${TIMEOUT / 1000}초, ${RUNS}번` +
    `${START_STAGE > 1 ? `, ${START_STAGE}스테이지부터` : ''}${CAMPAIGN ? ', 캠페인(이기면 다음 스테이지)' : ''}${KEEP_SAVE ? ', 저장 이어서' : ''}`,
  '',
  '| 회차 | 스테이지 | 결과 | 시간(초) | 웨이브 | 레벨 | 처치 | 퀴즈 정답 | 새 단어 | 맞은 횟수 | 최저 HP |',
  '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ...allRows.map((r) => `| ${r.run} | ${r.stage ?? '-'} | ${label[r.result] ?? r.result} | ${r.seconds ?? '-'} | ${r.waveReached ?? '-'} | ${r.level ?? '-'} | ${r.kills ?? '-'} | ${r.quiz ?? '-'} | ${r.learned ?? '-'} | ${r.hurt ?? '-'} | ${r.minHpRatio ?? '-'} |`),
  '',
  '## 회차별',
  ...results.map((r) => `- 회차 ${r.run}: 플레이 ${r.rows.length}번, 총 ${r.totalSeconds ?? '-'}초, FPS ${r.fps ?? '-'}, 오류 ${r.errors.length}` +
    (r.profileBefore && r.profileAfter ? ` · Lv ${r.profileBefore.level}→${r.profileAfter.level}, 골드 ${r.profileBefore.gold}→${r.profileAfter.gold}, 도감 ${r.profileBefore.collected}→${r.profileAfter.collected}, 클리어 ${r.profileAfter.clears}` : '')),
  '',
  'FPS는 이 PC 기준. 화면 주사율(보통 60)이 상한이다. headless는 소프트웨어 렌더링(SwiftShader)이라 실제 GPU보다 느리다. 실제 GPU로 재려면 --headed.',
  '',
  `렌더러: ${[...new Set(results.map((r) => r.gpu).filter(Boolean))].join(' / ') || '-'}`,
  '',
  '## 오류',
  ...(results.some((r) => r.errors.length) ? results.flatMap((r) => r.errors.map((e) => `- 회차 ${r.run}: ${e}`)) : ['없음']),
  '',
  '## 스크린샷',
  ...results.flatMap((r) => r.shots.map((f) => `- ${f}`)),
  '',
].join('\n');
writeFileSync(join(OUT, 'report.md'), md);
writeFileSync(join(OUT, 'report.json'), JSON.stringify({ stamp, wrongRate: WRONG_RATE, dodge: DODGE, results }, null, 2));
console.log(`\n리포트: ${join(OUT, 'report.md')}`);
process.exit(results.some((r) => r.errors.length || r.rows.some((x) => x.result === 'webgl-error')) ? 1 : 0);
