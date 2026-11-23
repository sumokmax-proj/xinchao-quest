/**
 * 스테이지 분위기: 바닥·하늘·빛 색과 나무 모양.
 * 맵 JSON의 "theme" 값으로 고른다. 없으면 meadow.
 */
export interface Theme {
  sky: string; // 맵 바깥 배경색
  outer: string; // 맵 바깥 땅
  ground: [string, string]; // 바닥 체크무늬 두 색
  edge: string; // 테두리(나무·벽) 아래 바닥
  leaf: [string, string];
  trunk: string;
  tree: 'pine' | 'bamboo';
  rock: string;
  bush: string;
  water: string;
  hemiSky: number;
  hemiGround: number;
  hemi: number; // 하늘빛 세기 (옛 three 기준 값, scene.ts에서 π를 곱함)
  sunColor: number;
  sun: number;
}

const meadow: Theme = {
  sky: '#1a3329',
  outer: '#2c4a2a',
  ground: ['#5a9442', '#64a04a'],
  edge: '#4f7f3c',
  leaf: ['#2f6b34', '#3f8a3c'],
  trunk: '#7a4e2d',
  tree: 'pine',
  rock: '#8d918c',
  bush: '#5aa04a',
  water: '#3f86a8',
  hemiSky: 0xcfe8ff,
  hemiGround: 0x2f4a24,
  hemi: 0.5,
  sunColor: 0xffe0b0,
  sun: 0.78,
};

export const THEMES: Record<string, Theme> = {
  meadow,
  /** 마을: 밝은 오후, 따뜻한 흙길 */
  village: {
    ...meadow,
    sky: '#24402f',
    outer: '#3a5a32',
    ground: ['#8fb862', '#97c06a'],
    edge: '#5f8a44',
    hemiSky: 0xfff0d8,
    sunColor: 0xfff0c8,
    sun: 0.85,
  },
  /** 대나무 숲: 밝은 연두, 키 큰 대나무 */
  bamboo: {
    ...meadow,
    sky: '#1d3320',
    outer: '#34512a',
    ground: ['#719c48', '#7aa851'],
    edge: '#5e8a3d',
    leaf: ['#6fae3e', '#86c250'],
    trunk: '#9cc25a',
    tree: 'bamboo',
    bush: '#7cbf52',
    hemiSky: 0xe0ffd0,
    sunColor: 0xfff0c0,
  },
  /** 강둑: 모래빛 풀, 넓은 물, 늦은 오후 햇빛 */
  river: {
    ...meadow,
    sky: '#1f3436',
    outer: '#3a5a46',
    ground: ['#8aa257', '#93ab60'],
    edge: '#6d8a48',
    water: '#3b7d9c',
    hemiSky: 0xd8ecff,
    sunColor: 0xffd29a,
    sun: 0.82,
  },
  /** 시장 골목: 흙바닥, 해 질 녘 주황빛 */
  market: {
    ...meadow,
    sky: '#2a2230',
    outer: '#4a3a30',
    ground: ['#b08f6a', '#a88664'],
    edge: '#7b6a4e',
    leaf: ['#3a6b3a', '#4d7f3d'],
    rock: '#9a8f86',
    bush: '#5f9a4a',
    hemiSky: 0xffe2c8,
    hemiGround: 0x4a3426,
    hemi: 0.48,
    sunColor: 0xffb878,
    sun: 0.72,
  },
  /** 논두렁: 흙길과 물 댄 논 */
  paddy: {
    ...meadow,
    sky: '#1c3330',
    outer: '#3c5a3a',
    ground: ['#9e8c5c', '#a79565'],
    edge: '#6f7f45',
    water: '#4f8f86',
    hemiSky: 0xd6f0ff,
    sunColor: 0xfff0d0,
  },
  /** 고블린 요새: 어두운 돌바닥, 붉은 빛 */
  fort: {
    ...meadow,
    sky: '#141019',
    outer: '#24202a',
    ground: ['#7c7884', '#736f7b'],
    edge: '#55525e',
    rock: '#8a8792',
    hemiSky: 0xc8c0e0,
    hemiGround: 0x3a2a2a,
    hemi: 0.46,
    sunColor: 0xffb090,
    sun: 0.72,
  },
};

export const getTheme = (name: string | undefined): Theme => THEMES[name ?? 'meadow'] ?? meadow;
