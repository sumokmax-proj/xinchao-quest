import { describe, expect, it } from 'vitest';
import { CONFIG, type EnemyKind } from '../src/config';
import stagesJson from '../src/data/stages.json';
import type { StageData } from '../src/core/Stages';
import { rollWave, stageMix, waveCost, type EnemyCost } from '../src/core/WaveRoll';
import { seq } from './helpers';

const STAGES = stagesJson as StageData[];
const COST = CONFIG.run.enemyCost as EnemyCost;

/** 같은 씨앗이면 같은 수열 (테스트용 간단한 난수) */
function seeded(seed: number) {
  let x = seed >>> 0;
  return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296);
}

const count = (list: readonly EnemyKind[], k: EnemyKind) => list.filter((x) => x === k).length;

describe('웨이브 구성 섞기', () => {
  it('스테이지에 나오는 섞을 수 있는 몬스터 목록 (대장·왕은 빠짐)', () => {
    expect(stageMix(STAGES[1].waves, COST)).toEqual(['goblin', 'monkey']);
    expect(stageMix(STAGES[5].waves, COST)).not.toContain('king');
    expect(stageMix(STAGES[5].waves, COST)).not.toContain('boss');
  });

  it('한 종류뿐인 웨이브는 그대로 (1스테이지 풀밭)', () => {
    const mix = stageMix(STAGES[0].waves, COST);
    for (const w of STAGES[0].waves) {
      expect([...rollWave(w.enemies, mix, COST, seeded(1))].sort()).toEqual([...w.enemies].sort());
    }
  });

  it('작은 예: 고블린 2·원숭이 2 → 고블린·원숭이 한 마리씩은 꼭, 나머지 2점을 섞음', () => {
    // 0.9 → 원숭이, 0.1 → 고블린 (pick은 목록 순서 goblin, monkey)
    const out = rollWave(['goblin', 'goblin', 'monkey', 'monkey'], ['goblin', 'monkey'], COST, seq(0.9, 0.9, 0.5));
    expect(count(out, 'goblin')).toBe(1);
    expect(count(out, 'monkey')).toBe(3);
  });

  it('모든 스테이지·웨이브를 300번씩 섞어도 규칙을 지킴', () => {
    for (const st of STAGES) {
      const mix = stageMix(st.waves, COST);
      for (const w of st.waves) {
        const rng = seeded(st.id.length * 97 + w.enemies.length);
        const before = waveCost(w.enemies, COST);
        for (let i = 0; i < 300; i++) {
          const out = rollWave(w.enemies, mix, COST, rng, CONFIG.run.waveMaxExtra);
          // 대장·보스는 그대로
          for (const boss of ['boss', 'king'] as EnemyKind[]) expect(count(out, boss)).toBe(count(w.enemies, boss));
          // 원래 있던 종류는 한 마리씩 꼭 남음
          for (const k of new Set(w.enemies)) expect(count(out, k)).toBeGreaterThanOrEqual(1);
          // 스테이지에 없는 몬스터는 나오지 않음
          for (const k of out) expect([...mix, 'boss', 'king']).toContain(k);
          // 강함 점수: 원래보다 세지지 않고, 줄어도 1점 미만
          const after = waveCost(out, COST);
          expect(after).toBeLessThanOrEqual(before + 1e-9);
          expect(before - after).toBeLessThan(1);
          // 마릿수는 원래 + 1까지
          expect(out.length).toBeLessThanOrEqual(w.enemies.length + CONFIG.run.waveMaxExtra);
          expect(out.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('판마다 실제로 구성이 달라짐 (2스테이지 이후 웨이브에서 여러 조합이 나옴)', () => {
    const st = STAGES[2];
    const mix = stageMix(st.waves, COST);
    const rng = seeded(7);
    const seen = new Set<string>();
    for (let i = 0; i < 50; i++) seen.add([...rollWave(st.waves[2].enemies, mix, COST, rng)].sort().join(','));
    expect(seen.size).toBeGreaterThan(2);
  });

  it('원본 목록은 바뀌지 않음', () => {
    const src: EnemyKind[] = ['goblin', 'goblin', 'monkey', 'boss'];
    const copy = src.slice();
    rollWave(src, ['goblin', 'monkey'], COST, seeded(3));
    expect(src).toEqual(copy);
  });

  it('대장은 목록 맨 뒤 (등장 순서가 원래와 비슷하게)', () => {
    const out = rollWave(['goblin', 'boss', 'monkey', 'goblin'], ['goblin', 'monkey'], COST, seeded(5));
    expect(out[out.length - 1]).toBe('boss');
  });
});
