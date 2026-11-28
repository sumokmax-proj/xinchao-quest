import { describe, expect, it } from 'vitest';
import villageJson from '../src/data/village.json';
import { activeNpcs, builtSet, newlyBuilt, nextBuilding, rebuildGoal, pickVillageQuestion, questionOptions, touchAt, type VillageData } from '../src/core/Village';
import { Grid } from '../src/world/Grid';
import { seq } from './helpers';
import { hasFinal, josa } from '../src/core/korean';

const V = villageJson as VillageData;

describe('village.json', () => {
  it('맵: 직사각형, 시작 칸은 바닥, 성문이 있음', () => {
    const g = new Grid(V.rows);
    expect(g.isBlocked(V.start.c, V.start.r)).toBe(false);
    expect(V.rows.join('')).toContain('G');
  });
  it('NPC는 모두 바닥 칸에 서 있고 자리가 겹치지 않음, 건물 id가 있음', () => {
    const g = new Grid(V.rows);
    const ids = new Set(V.buildings.map((b) => b.id));
    const spots = new Set<string>();
    for (const n of V.npcs) {
      expect(g.isBlocked(n.at.c, n.at.r), n.id).toBe(false);
      expect(ids.has(n.building), n.id).toBe(true);
      spots.add(`${n.at.c},${n.at.r}`);
    }
    expect(spots.size).toBe(V.npcs.length);
  });
  it('NPC가 서 있어도 시작 칸에서 성문 앞까지 걸어갈 수 있음 (모든 바닥이 이어짐)', () => {
    const g = new Grid(V.rows);
    const npc = new Set(V.npcs.map((n) => `${n.at.c},${n.at.r}`));
    const free = (c: number, r: number) => !g.isBlocked(c, r) && !npc.has(`${c},${r}`);
    const seen = new Set([`${V.start.c},${V.start.r}`]);
    const q = [V.start];
    while (q.length) {
      const { c, r } = q.shift()!;
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const k = `${c + dc},${r + dr}`;
        if (!seen.has(k) && free(c + dc, r + dr)) {
          seen.add(k);
          q.push({ c: c + dc, r: r + dr });
        }
      }
    }
    let floors = 0;
    V.rows.forEach((row, r) => [...row].forEach((ch, c) => ch === '.' && free(c, r) && floors++));
    expect(seen.size).toBe(floors);
  });
  it('질문은 정답과 오답이 다름', () => {
    V.questions.forEach((q) => expect(q.right).not.toBe(q.wrong));
  });
});

describe('마을 재건', () => {
  it('도감 0개: 성과 반미 가게만', () => {
    expect([...builtSet(V.buildings, 0)].sort()).toEqual(['bakery', 'castle']);
  });
  it('단어를 모으면 건물이 늘어남', () => {
    expect(builtSet(V.buildings, 100).size).toBe(V.buildings.length);
    expect(builtSet(V.buildings, 8).has('smith')).toBe(true);
  });
  it('다음 복구 건물', () => {
    expect(nextBuilding(V.buildings, 0)?.id).toBe('smith');
    expect(nextBuilding(V.buildings, 999)).toBeNull();
  });
  it('건물이 없으면 그 NPC도 없음', () => {
    const ids = activeNpcs(V, 0).map((n) => n.id);
    expect(ids).toContain('lord');
    expect(ids).toContain('baker');
    expect(ids).toContain('guard');
    expect(ids).not.toContain('smith');
  });
});

describe('부딪힌 곳', () => {
  it('NPC, 성문, 건물, 빈 곳', () => {
    const npcs = activeNpcs(V, 999);
    expect(touchAt(V, npcs, 5, 3)).toMatchObject({ kind: 'npc', npc: { id: 'lord' } });
    expect(touchAt(V, npcs, 5, 16)).toEqual({ kind: 'gate' });
    expect(touchAt(V, npcs, 1, 5)).toMatchObject({ kind: 'building', building: { id: 'bakery' } });
    expect(touchAt(V, npcs, 5, 9)).toEqual({ kind: 'none' });
  });
});

describe('마을 사람 질문', () => {
  it('이미 물은 건 빼고', () => {
    const asked = new Set(V.questions.slice(1).map((q) => q.q));
    expect(pickVillageQuestion(V.questions, asked, seq(0.5)).q).toBe(V.questions[0].q);
  });
  it('보기 순서', () => {
    const q = V.questions[0];
    expect(questionOptions(q, seq(0.1))).toEqual({ options: [q.right, q.wrong], answer: 0 });
    expect(questionOptions(q, seq(0.9))).toEqual({ options: [q.wrong, q.right], answer: 1 });
  });
});

describe('마을 맵 글자', () => {
  it('필드 지형 글자(T 빼고 R·B·W·P·S·X·F)를 건물에 쓰지 않음 (쓰면 바위·덤불·좌판으로 그려짐)', () => {
    const fieldOnly = ['R', 'B', 'W', 'P', 'S', 'X', 'F'];
    V.buildings.forEach((b) => expect(fieldOnly).not.toContain(b.tile));
    V.rows.forEach((row) => fieldOnly.forEach((ch) => expect(row).not.toContain(ch)));
  });
});

describe('마을 재건 목표', () => {
  const B = V.buildings;
  it('다음 건물과 남은 수', () => {
    const fountain = B.find((b) => b.id === 'fountain')!;
    expect(rebuildGoal(B, fountain.need - 2)).toEqual({ name: fountain.name, need: fountain.need, left: 2 });
  });
  it('다 지었으면 null', () => {
    expect(rebuildGoal(B, Math.max(...B.map((b) => b.need)))).toBeNull();
  });
  it('한 판에 새로 지어진 건물: 기준을 넘은 것만, 적은 순', () => {
    expect(newlyBuilt(B, 7, 8).map((b) => b.id)).toEqual(['smith']);
    expect(newlyBuilt(B, 17, 30).map((b) => b.id)).toEqual(['school', 'cafe']);
    expect(newlyBuilt(B, 8, 8)).toEqual([]);
    expect(newlyBuilt(B, 0, 7)).toEqual([]);
  });
});

describe('조사 이/가', () => {
  it('받침 있음/없음', () => {
    expect(josa('분수 광장', '이', '가')).toBe('분수 광장이');
    expect(josa('카페', '이', '가')).toBe('카페가');
    expect(josa('대장간', '이', '가')).toBe('대장간이');
    expect(josa('서당', '이', '가')).toBe('서당이');
  });
  it('끝의 괄호 설명은 빼고 읽음', () => {
    expect(josa('마을 축제 (등불)', '이', '가')).toBe('마을 축제 (등불)가');
  });
  it('숫자: 1·3·6·7·8·0은 받침 있음', () => {
    expect(hasFinal('1')).toBe(true);
    expect(hasFinal('2')).toBe(false);
    expect(hasFinal('10')).toBe(true);
    expect(hasFinal('5')).toBe(false);
  });
});
