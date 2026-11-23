/**
 * 밸런스 수치는 전부 여기에 모은다.
 * 값은 프로토타입(prototype/action-3d.html)과 CLAUDE.md의 "손맛 기준값"과 같다.
 * 바꾸면 오너에게 "이전 값 → 새 값"을 표로 알린다.
 * 시간 단위는 모두 초(second).
 */
import type { AttackPattern } from './combat/Telegraph';

export const CONFIG = {
  player: {
    moveDuration: 0.15, // 한 칸 이동에 걸리는 시간
    attackCooldown: 0.36, // 범프 공격 사이 간격
    wallBumpCooldown: 0.18, // 벽·나무에 부딪힌 뒤 공격 못 하는 시간
    maxHp: 100,
    attack: 10,
    critChance: 0.18, // 크리티컬 확률 18%
    critMultiplier: 1.6,
    damageSpreadMin: 0.9, // 데미지 흔들림 (공격력 × 0.9 ~ 1.1)
    damageSpreadMax: 1.1,
    swingDuration: 0.26, // 검 휘두르는 모션 길이
  },

  level: {
    expBase: 30, // Lv1 → Lv2에 필요한 EXP
    expPerLevel: 20, // 레벨마다 필요 EXP 증가량
    attackPerLevel: 3,
    maxHpPerLevel: 10,
    healOnLevelUp: 25,
  },

  enemies: {
    goblin: {
      hp: 30,
      damage: 8,
      telegraph: 0.78, // 빨간 예고 후 공격까지
      attackRecover: 1.15, // 공격 후 다음 예고까지 쉬는 시간
      moveDuration: 0.26,
      chaseStepDelay: 0.55, // 추격할 때 걸음 간격 (+ 0 ~ chaseStepJitter)
      quizCount: 1, // 마무리에 필요한 연속 정답 수
      exp: 12,
      gold: 3000,
      scale: 1,
      pattern: 'single', // 공격 모양 (combat/Telegraph.ts)
      range: 1,
      name: '고블린',
      phases: [], // 지역 보스만: HP가 이 비율 아래로 내려갈 때마다 퀴즈
    },
    boss: {
      hp: 70,
      damage: 14,
      telegraph: 0.62,
      attackRecover: 0.9,
      moveDuration: 0.3,
      chaseStepDelay: 0.45,
      quizCount: 2,
      exp: 40,
      gold: 20000,
      scale: 1.35,
      pattern: 'single',
      range: 1,
      name: '대장 고블린',
      phases: [],
    },
    /** 대나무 숲: 빠르고 약함. 예고가 짧다 */
    monkey: {
      hp: 20,
      damage: 6,
      telegraph: 0.6,
      attackRecover: 0.9,
      moveDuration: 0.16,
      chaseStepDelay: 0.28,
      quizCount: 1,
      exp: 10,
      gold: 2500,
      scale: 0.9,
      pattern: 'single',
      range: 1,
      name: '원숭이',
      phases: [],
    },
    /** 홍강 둑길: 느리고 단단함. 앞으로 2칸 들이받기 */
    buffalo: {
      hp: 56,
      damage: 13,
      telegraph: 1.0,
      attackRecover: 1.5,
      moveDuration: 0.4,
      chaseStepDelay: 0.85,
      quizCount: 1,
      exp: 20,
      gold: 5000,
      scale: 1.1,
      pattern: 'line2',
      range: 1,
      name: '물소',
      phases: [],
    },
    /** 시장 골목: 앞 칸과 좌우까지 물어뜯기 */
    dog: {
      hp: 34,
      damage: 10,
      telegraph: 0.72,
      attackRecover: 1.1,
      moveDuration: 0.2,
      chaseStepDelay: 0.42,
      quizCount: 1,
      exp: 15,
      gold: 4000,
      scale: 0.95,
      pattern: 'wide',
      range: 1,
      name: '들개',
      phases: [],
    },
    /** 논두렁: 떨어진 곳에서 일직선으로 물총 */
    frog: {
      hp: 24,
      damage: 9,
      telegraph: 0.9,
      attackRecover: 1.7,
      moveDuration: 0.3,
      chaseStepDelay: 0.75,
      quizCount: 1,
      exp: 15,
      gold: 4000,
      scale: 0.9,
      pattern: 'ranged',
      range: 4,
      name: '개구리',
      phases: [],
    },
    /** 고블린 요새의 지역 보스: 3칸 휘두르기와 주변 8칸 내려찍기를 번갈아 */
    king: {
      hp: 120,
      damage: 16,
      telegraph: 0.9,
      attackRecover: 1.0,
      moveDuration: 0.34,
      chaseStepDelay: 0.6,
      quizCount: 3,
      exp: 150,
      gold: 100000,
      scale: 1.7,
      pattern: 'slam',
      range: 1,
      name: '고블린 왕',
      phases: [2 / 3, 1 / 3],
    },
  },

  goblinAi: {
    chaseRange: 7, // 이 거리(칸, 가로+세로) 안이면 플레이어를 쫓아옴
    chaseStepJitter: 0.3,
    pathSearchDepth: 14, // 쫓아올 때 나무·바위를 돌아가는 길을 최대 몇 걸음까지 찾을지
    wanderMin: 1, // 멀리 있을 때 어슬렁거리는 간격 (고블린마다 1~2초 중 하나)
    wanderMax: 2,
    wanderJitter: 0.6,
    firstMoveMin: 0.4, // 등장 후 첫 걸음까지
    firstMoveMax: 1.2,
    firstAttackDelay: 0.6, // 등장 후 첫 공격 예고까지
    resumeMoveDelay: 0.7, // 오답으로 다시 움직이기 시작할 때
    resumeAttackDelay: 0.9,
    spawnMinDistance: 5, // 플레이어와 최소 이 거리 밖에서 등장
    spawnMaxTries: 200,
  },

  quiz: {
    timeLimit: 5, // 퀴즈 제한시간
    inputGuard: 0.28, // 퀴즈가 뜬 직후 이 시간 동안은 입력 무시 (누르고 있던 버튼으로 실수 방지)
    healRatio: 0.15, // 오답·시간 초과 시 최대 HP의 15%로 회복
    othersSpeed: 0.25, // 퀴즈 중 다른 고블린 속도 배율
    reviewChance: 0.4, // 오답노트 단어가 나올 확률
    olderChance: 0.3, // 앞 스테이지 주제 단어까지 섞어서 낼 확률 (복습)
    toneChance: 0.4, // 성조만 다른 짝이 있는 단어일 때 성조 구별 문제가 나올 확률
    reviewClearAt: 3, // 오답노트 점수가 이 값이 되면 오답노트에서 빠짐 (틀리면 1, 맞힐 때마다 +1)
    nextQuestionDelay: 0.5, // 대장: 정답 후 다음 문제까지
    finishDelay: 0.35, // 정답 후 처치 연출까지
    recoverDelay: 0.5, // 오답 후 고블린이 회복하기까지
    phaseBonus: 0.12, // 지역 보스 단계 퀴즈를 맞히면 최대 HP의 12% 추가 피해
  },

  village: {
    answerGold: 2000, // 마을 사람 질문에 맞게 대답하면 받는 골드
  },

  wave: {
    nextDelay: 1.1, // 웨이브를 다 잡고 다음 웨이브까지
    clearDelay: 1.2, // 마지막 웨이브 후 클리어 화면까지
  },

  camera: {
    viewWidth: 7.6, // 화면 가로에 보이는 칸 수
    offset: { x: 0, y: 12, z: 6.5 },
    lookAhead: 2.3, // 플레이어보다 이만큼 위쪽(앞)을 비춤
    followSpeed: 6,
    shakeDecay: 1.4,
  },

  feel: {
    knockback: 0.22, // 맞은 고블린이 밀려나는 거리
    hitFlash: 0.12,
    shakeHit: 0.08,
    shakeCrit: 0.16,
    shakeHurt: 0.22,
    shakeKill: 0.18,
    shakeBossKill: 0.35,
    gameOverDelay: 0.8,
  },

  render: {
    pixelBaseWidth: 200, // 도트 모드: 화면 가로를 약 200픽셀로 그린 뒤 확대
    maxPixelRatio: 2,
  },
} as const;

export type EnemyKind = keyof typeof CONFIG.enemies;

/** 적 한 종류의 능력치 (스테이지 배율을 곱한 뒤의 값도 이 모양) */
export interface EnemyStats {
  pattern: AttackPattern;
  range: number;
  name: string;
  phases: readonly number[];
  hp: number;
  damage: number;
  telegraph: number;
  attackRecover: number;
  moveDuration: number;
  chaseStepDelay: number;
  quizCount: number;
  exp: number;
  gold: number;
  scale: number;
}
