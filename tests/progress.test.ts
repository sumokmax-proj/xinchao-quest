import { describe, expect, it } from 'vitest';
import { gainExp } from '../src/combat/rules';
import { buildDex, buildWrongList, dexProgress, freshProfile, heroStatsFor, isCollected, recordAnswer, sanitizeProfile } from '../src/core/Progress';
import { clearProgress, defaultSave, parseSave } from '../src/core/Save';

describe('레벨에서 능력치 계산', () => {
  it('Lv1은 공격 10, HP 100', () => {
    expect(heroStatsFor(1, 0)).toEqual({ level: 1, exp: 0, attack: 10, hp: 100, maxHp: 100 });
  });
  it('레벨업으로 오른 능력치와 저장된 레벨로 계산한 능력치가 같음 (HP는 가득)', () => {
    const { stats } = gainExp(heroStatsFor(1, 0), 30 + 50 + 70 + 5);
    expect(stats.level).toBe(4);
    const loaded = heroStatsFor(stats.level, stats.exp);
    expect(loaded.attack).toBe(stats.attack);
    expect(loaded.maxHp).toBe(stats.maxHp);
    expect(loaded.hp).toBe(loaded.maxHp);
    expect(loaded.exp).toBe(5);
  });
});

describe('단어 도감 기록', () => {
  it('처음 맞히면 도감에 들어가고 newlyLearned', () => {
    const a = recordAnswer({}, 'tôi', true, 1000);
    expect(a.newlyLearned).toBe(true);
    expect(isCollected(a.dex, 'tôi')).toBe(true);
    expect(a.dex['tôi']).toEqual({ right: 1, wrong: 0, first: 1000 });
  });
  it('두 번째로 맞히면 newlyLearned 아님, 처음 시각 유지', () => {
    const a = recordAnswer({}, 'tôi', true, 1000);
    const b = recordAnswer(a.dex, 'tôi', true, 2000);
    expect(b.newlyLearned).toBe(false);
    expect(b.dex['tôi']).toEqual({ right: 2, wrong: 0, first: 1000 });
  });
  it('틀리기만 하면 기록은 남지만 도감에는 없음', () => {
    const a = recordAnswer({}, 'nhà', false, 1000);
    expect(a.newlyLearned).toBe(false);
    expect(isCollected(a.dex, 'nhà')).toBe(false);
    expect(a.dex['nhà'].wrong).toBe(1);
  });
  it('원본은 바뀌지 않음', () => {
    const dex = {};
    recordAnswer(dex, 'tôi', true, 1);
    expect(dex).toEqual({});
  });
  it('진행률', () => {
    const { dex } = recordAnswer({}, 'tôi', true, 1);
    expect(dexProgress(dex, [{ vi: 'tôi' }, { vi: 'bạn' }, { vi: 'nhà' }])).toEqual({ collected: 1, total: 3 });
  });
});

describe('저장 읽기', () => {
  it('저장이 없으면 기본값', () => {
    expect(parseSave(null)).toEqual(defaultSave());
  });
  it('깨진 JSON이면 기본값', () => {
    expect(parseSave('{oops')).toEqual(defaultSave());
  });
  it('예전 형식(profile·dex 없음)도 읽고, 오답노트·설정은 유지', () => {
    const s = parseSave(JSON.stringify({ wrong: { tôi: 1 }, sound: false, pixel: true, answeredQuiz: true }));
    expect(s.wrong).toEqual({ tôi: 1 });
    expect(s.sound).toBe(false);
    expect(s.profile).toEqual(freshProfile());
    expect(s.dex).toEqual({});
  });
  it('이상한 숫자는 기본값으로 고침', () => {
    const p = sanitizeProfile({ level: -3, exp: 'a', gold: 500.7, kills: NaN });
    expect(p.level).toBe(1);
    expect(p.exp).toBe(0);
    expect(p.gold).toBe(500);
    expect(p.kills).toBe(0);
  });
  it('저장 → 읽기 왕복', () => {
    const s = defaultSave();
    s.profile.level = 5;
    s.profile.gold = 12000;
    s.dex = recordAnswer({}, 'tôi', true, 99).dex;
    expect(parseSave(JSON.stringify(s))).toEqual(s);
  });
  it('진행 초기화는 설정을 남김', () => {
    const s = { ...defaultSave(), sound: false };
    s.profile.level = 9;
    const c = clearProgress(s);
    expect(c.profile.level).toBe(1);
    expect(c.sound).toBe(false);
  });
});

describe('단어장 정리', () => {
  const words = [
    { vi: 'tôi', ko: '나', topic: '자기소개' },
    { vi: 'bạn', ko: '친구', topic: '자기소개' },
    { vi: 'một', ko: '하나', topic: '숫자' },
  ];
  it('주제별로 묶고 모은 수를 셈', () => {
    const { dex } = recordAnswer({}, 'bạn', true, 1);
    const book = buildDex(words, dex);
    expect(book.map((t) => t.topic)).toEqual(['자기소개', '숫자']);
    expect(book[0]).toMatchObject({ collected: 1, total: 2 });
    expect(book[0].entries[1]).toMatchObject({ vi: 'bạn', collected: true, right: 1 });
    expect(book[1]).toMatchObject({ collected: 0, total: 1 });
  });
  it('오답노트는 최근에 틀린(점수 낮은) 단어부터, 없는 단어는 뺌', () => {
    const list = buildWrongList(words, { tôi: 2, một: 1, 'không có': 1 });
    expect(list.map((w) => w.vi)).toEqual(['một', 'tôi']);
    expect(list[0].ko).toBe('하나');
  });
});

describe('배경음 악보', async () => {
  const { SONGS, noteFreq, eighth } = await import('../src/audio/Music');
  it('모든 곡이 16칸, 음계 번호가 음계 안', () => {
    for (const s of Object.values(SONGS)) {
      expect(s.melody).toHaveLength(16);
      expect(s.bass).toHaveLength(16);
      [...s.melody, ...s.bass].forEach((n) => n === null || expect(n).toBeLessThan(s.scale.length));
    }
  });
  it('음계 0번은 기준음, 한 옥타브 위는 두 배', () => {
    const s = SONGS.field;
    expect(noteFreq(s, 0)).toBeCloseTo(s.root);
    expect(noteFreq(s, 0, 1)).toBeCloseTo(s.root * 2);
  });
  it('8분음표 길이: 120bpm이면 0.25초', () => expect(eighth(120)).toBeCloseTo(0.25));
});
