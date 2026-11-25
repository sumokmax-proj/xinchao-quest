import { describe, expect, it } from 'vitest';
import stagesJson from '../src/data/stages.json';
import words from '../src/data/words.json';
import { CONFIG } from '../src/config';
import { isUnlocked, lastUnlocked, pickPool, recordClear, sanitizeStageRecords, starsFor, scaleEnemy, stageWords, type StageData } from '../src/core/Stages';
import { MAPS } from '../src/world/maps';
import { Grid } from '../src/world/Grid';
import { seq } from './helpers';

const STAGES = stagesJson as StageData[];

describe('stages.json', () => {
  it('스테이지 5개 이상, id가 겹치지 않음', () => {
    expect(STAGES.length).toBeGreaterThanOrEqual(5);
    expect(new Set(STAGES.map((s) => s.id)).size).toBe(STAGES.length);
  });
  it('모든 스테이지: 맵이 있고, 웨이브가 있고, 적 종류가 config에 있음', () => {
    for (const st of STAGES) {
      expect(MAPS[st.map], st.map).toBeDefined();
      expect(st.waves.length).toBeGreaterThan(0);
      st.waves.forEach((w) => w.enemies.forEach((k) => expect(Object.keys(CONFIG.enemies)).toContain(k)));
      expect(st.power).toBeGreaterThan(0);
    }
  });
  it('뒤 스테이지일수록 배율이 커짐', () => {
    for (let i = 1; i < STAGES.length; i++) {
      expect(STAGES[i].power).toBeGreaterThan(STAGES[i - 1].power);
      expect(STAGES[i].damage).toBeGreaterThanOrEqual(STAGES[i - 1].damage);
    }
  });
  it('스테이지 주제마다 단어가 6개 이상 (2지선다 보기가 다양하게)', () => {
    STAGES.forEach((_, i) => expect(stageWords(words, STAGES, i).main.length).toBeGreaterThanOrEqual(6));
  });
  it('마지막 스테이지 마지막 웨이브에 지역 보스(고블린 왕)', () => {
    const last = STAGES[STAGES.length - 1];
    expect(last.waves[last.waves.length - 1].enemies).toContain('king');
  });
  it('스테이지마다 그 스테이지에서 처음 나오는 몬스터가 있음 (1스테이지 제외)', () => {
    const seen = new Set<string>();
    STAGES.forEach((st, i) => {
      const kinds = new Set(st.waves.flatMap((w) => w.enemies));
      if (i > 0) expect([...kinds].some((k) => !seen.has(k)), st.id).toBe(true);
      kinds.forEach((k) => seen.add(k));
    });
  });
  it('모든 단어 주제가 어느 스테이지엔가 나옴', () => {
    const topics = new Set(STAGES.flatMap((s) => s.topics));
    words.forEach((w) => expect(topics.has(w.topic), w.topic).toBe(true));
  });
});

describe('맵 파일 (src/data/maps)', () => {
  for (const [name, map] of Object.entries(MAPS)) {
    it(`${name}: 직사각형, 테두리 막힘, 시작 칸이 바닥, 모든 바닥이 이어져 있음`, () => {
      const g = new Grid(map.rows);
      for (let c = 0; c < g.width; c++) expect(g.isBlocked(c, 0) && g.isBlocked(c, g.height - 1)).toBe(true);
      for (let r = 0; r < g.height; r++) expect(g.isBlocked(0, r) && g.isBlocked(g.width - 1, r)).toBe(true);
      expect(g.isBlocked(map.start.c, map.start.r)).toBe(false);
      // 시작 칸에서 너비 우선 탐색으로 갈 수 있는 바닥 수 = 전체 바닥 수
      const seen = new Set([`${map.start.c},${map.start.r}`]);
      const queue = [map.start];
      while (queue.length) {
        const { c, r } = queue.shift()!;
        for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const k = `${c + dc},${r + dr}`;
          if (!seen.has(k) && !g.isBlocked(c + dc, r + dr)) {
            seen.add(k);
            queue.push({ c: c + dc, r: r + dr });
          }
        }
      }
      const floors = map.rows.join('').split('').filter((ch) => ch === '.').length;
      expect(seen.size).toBe(floors);
      // 등장 구역에 바닥이 충분
      let spawnFloors = 0;
      for (let r = map.spawnArea.minR; r <= map.spawnArea.maxR; r++)
        for (let c = map.spawnArea.minC; c <= map.spawnArea.maxC; c++) if (!g.isBlocked(c, r)) spawnFloors++;
      expect(spawnFloors).toBeGreaterThanOrEqual(12);
    });
  }
});

describe('스테이지 해금', () => {
  it('처음엔 1스테이지만', () => {
    expect(isUnlocked(STAGES, {}, 0)).toBe(true);
    expect(isUnlocked(STAGES, {}, 1)).toBe(false);
    expect(lastUnlocked(STAGES, {})).toBe(0);
  });
  it('앞 스테이지를 깨면 다음이 열림', () => {
    const rec = recordClear({}, STAGES[0].id, 120);
    expect(isUnlocked(STAGES, rec, 1)).toBe(true);
    expect(isUnlocked(STAGES, rec, 2)).toBe(false);
    expect(lastUnlocked(STAGES, rec)).toBe(1);
  });
  it('범위 밖은 잠김', () => {
    expect(isUnlocked(STAGES, {}, STAGES.length)).toBe(false);
  });
  it('클리어 기록: 횟수와 가장 빠른 시간', () => {
    let rec = recordClear({}, 'a', 120);
    rec = recordClear(rec, 'a', 90);
    rec = recordClear(rec, 'a', 150);
    expect(rec.a).toEqual({ clears: 3, best: 90, stars: 1 });
  });
  it('깨진 저장 값은 고침', () => {
    expect(sanitizeStageRecords({ a: { clears: -1, best: 'x' }, b: 5 })).toEqual({ a: { clears: 0, best: 0, stars: 0 } });
  });
});

describe('스테이지 단어', () => {
  const S: StageData[] = [
    { id: 'a', name: 'A', map: 'm', topics: ['인사'], power: 1, damage: 1, waves: [] },
    { id: 'b', name: 'B', map: 'm', topics: ['숫자'], power: 1, damage: 1, waves: [] },
    { id: 'c', name: 'C', map: 'm', topics: [], power: 1, damage: 1, waves: [] },
  ];
  const W = [
    { vi: 'xin chào', topic: '인사' },
    { vi: 'một', topic: '숫자' },
    { vi: 'hai', topic: '숫자' },
  ];
  it('이 스테이지 주제는 main, 앞 스테이지 주제는 older', () => {
    const p = stageWords(W, S, 1);
    expect(p.main.map((w) => w.vi)).toEqual(['một', 'hai']);
    expect(p.older.map((w) => w.vi)).toEqual(['xin chào']);
  });
  it('주제가 비어 있으면 모든 단어', () => {
    expect(stageWords(W, S, 2).main.length).toBe(3);
  });
  it('확률에 걸리면 앞 단어까지 섞음', () => {
    const p = stageWords(W, S, 1);
    expect(pickPool(p, seq(0.1), 0.3).length).toBe(3);
    expect(pickPool(p, seq(0.9), 0.3).length).toBe(2);
  });
});

describe('적 배율', () => {
  it('피해 배율을 따로 줄 수 있음', () => {
    const s = scaleEnemy(CONFIG.enemies.goblin, 2, 1.5);
    expect(s.hp).toBe(60);
    expect(s.damage).toBe(12);
  });
  it('HP·피해·EXP는 반올림, 골드는 500동 단위', () => {
    const s = scaleEnemy(CONFIG.enemies.goblin, 1.25);
    expect(s.hp).toBe(38);
    expect(s.damage).toBe(10);
    expect(s.exp).toBe(13); // 12 × √1.25
    expect(s.gold).toBe(4000);
    expect(s.telegraph).toBe(CONFIG.enemies.goblin.telegraph);
  });
});

describe('스테이지 별 (퀴즈 정답률)', () => {
  const rule = CONFIG.stars;
  it('졌으면 0, 클리어하면 최소 1', () => {
    expect(starsFor(false, 10, 10, rule)).toBe(0);
    expect(starsFor(true, 0, 10, rule)).toBe(1);
    expect(starsFor(true, 0, 0, rule)).toBe(1);
  });
  it('정답률 80% 이상 2개, 95% 이상 3개', () => {
    expect(starsFor(true, 15, 20, rule)).toBe(1);
    expect(starsFor(true, 16, 20, rule)).toBe(2);
    expect(starsFor(true, 18, 20, rule)).toBe(2);
    expect(starsFor(true, 19, 20, rule)).toBe(3);
  });
  it('가장 좋았던 별이 남는다', () => {
    let rec = recordClear({}, 'a', 100, 3);
    rec = recordClear(rec, 'a', 90, 1);
    expect(rec.a.stars).toBe(3);
  });
  it('별이 생기기 전의 저장은 깬 스테이지에 별 1개', () => {
    expect(sanitizeStageRecords({ a: { clears: 2, best: 50 }, b: { clears: 0, best: 0 }, c: { clears: 1, stars: 9 } })).toMatchObject({
      a: { stars: 1 },
      b: { stars: 0 },
      c: { stars: 3 },
    });
  });
});
