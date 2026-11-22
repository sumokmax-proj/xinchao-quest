# 씬짜오 퀘스트 (Xin Chào Quest)

베트남어 학습 3D 탑뷰 실시간 그리드 액션 RPG. 고블린을 범프 공격으로 때려 HP를 0으로 만들고, 마지막 일격은 머리 위 2지선다 베트남어 퀴즈로 끝낸다.

- 기획: `docs/game-design.md`
- 지금까지의 결정과 남은 질문: `docs/decisions-log.md`
- 레퍼런스 조사: `docs/reference-games-research.md`
- 손맛의 기준: `prototype/action-3d.html` (한 파일 Three.js 프로토타입, 실제로 재밌다고 검증됨)

## 개발자 정보
- 1인 개발 사이드 프로젝트. 오너(맥스)는 QC 매니저 출신으로 자바스크립트 기초는 이해하지만 코드를 직접 짜지 않는다.
- 설명은 한국어로, 자바스크립트 기초만 아는 사람이 이해할 수 있게.
- 베트남어는 하노이(북부) 표현 기준. 베트남어 데이터는 오너가 직접 검수한다.

## 게임 핵심 규칙 (바꾸기 전에 반드시 물어볼 것)
- 맵은 1×1 타일 격자. 플레이어는 상하좌우 4방향으로 한 칸씩 이동, 꾹 누르면 연속 이동
- 적이 있는 칸으로 이동하려 하면 = 공격 (범프 공격, 이스 방식). 별도 공격 버튼 없음
- 적은 공격 전 대상 칸을 바닥에 빨갛게 예고 → 플레이어가 피할 수 있어야 함
- 적 HP 0 → 빈사 상태, 머리 위에 문제 + 답 2개. ← / → 로 답함 (D-pad 좌우가 그대로 답 버튼, 말풍선 탭도 가능)
- 정답 → 처치, EXP·골드. 오답·시간 초과 → 적이 최대 HP의 15% 회복 후 전투 재개, 단어는 오답노트로
- 퀴즈 중에는 주변이 어두워지고 다른 적은 0.25배 속도
- 대장 고블린은 2문제 연속 정답 필요
- 보상은 학습 행동에만. 과금으로 강해지는 구조는 넣지 않는다

## 기술 스택
- Vite + TypeScript + three (npm). 직교 카메라, 위에서 약 60도, 세로 화면(모바일 우선)
- 퀴즈·HUD는 HTML/CSS 오버레이 (3D 공간 텍스트 쓰지 않음)
- 충돌은 타일 점유 체크 (물리 엔진 없음)
- 데이터는 `src/data/*.json` (코드 수정 없이 단어·웨이브·맵 추가)
- 저장은 localStorage (try/catch 필수). 나중에 Supabase
- 배포: GitHub Actions → GitHub Pages (`main`에 merge되면 자동 배포)
- 입력: PC는 방향키/WASD, 모바일은 D-pad + 스와이프

## 폴더 구조 (목표)
```
src/
  main.ts            진입점, 게임 루프
  config.ts          밸런스 수치 전부 (이동 속도, 쿨다운, HP, 회복률, 퀴즈 시간 ...)
  core/              Game, Input, Timers, Save
  world/             Grid(맵·점유), MapLoader, CameraRig
  entities/          Player, Goblin
  combat/            BumpAttack, Telegraph, QuizSystem
  render/            모델(임시 도형 → 나중에 glTF), Effects, PixelPass
  ui/                Hud, QuizBubble, DPad, Overlays, Toasts
  audio/             Sfx(WebAudio), Voice(베트남어 TTS)
  data/              words.json, waves.json, maps/*.json
public/models/       CC0 로폴리 에셋 (KayKit, Kenney, Quaternius)
tests/               순수 로직 단위 테스트 (vitest)
```

## 손맛 기준값 (프로토타입과 같게 유지)
이동 0.15초/칸 · 공격 쿨다운 0.36초 · 고블린 HP 30, 대장 70 · 플레이어 공격 10 (크리 18%, 1.6배) · 예고 0.78초(대장 0.62초) · 고블린 피해 8(대장 14) · 퀴즈 5초 · 오답 회복 15% · 퀴즈 중 다른 적 0.25배속 · 카메라 가로 7.6칸, 오프셋 (0, 12, 6.5)

## 작업 방식 (웹 Claude Code 기준)
오너는 주로 **웹/앱 Claude Code**로 작업한다. 이 환경에서는 오너가 개발 서버 화면을 볼 수 없고 GPU도 없다. 그래서:
1. 작업은 항상 새 브랜치에서 하고 PR로 올린다. `main`에 직접 push하지 않는다.
2. 화면 대신 검증할 수 있는 것은 직접 검증한다: `npm run build`, `npm run typecheck`, `npm test`. 실패한 상태로 PR을 올리지 않는다.
3. 게임 로직(그리드 이동, 점유, 데미지, 퀴즈 판정, 오답 회복, 웨이브 진행)은 three와 분리된 순수 함수로 두고 단위 테스트를 붙인다.
4. 손맛은 오너가 배포된 페이지에서 폰으로 직접 확인한다. PR에 확인 체크리스트를 반드시 적는다.
5. 요청 범위 밖의 파일은 건드리지 않는다. 꼭 필요하면 PR에 이유를 적는다.
6. `config.ts` 수치를 바꾸면 PR에 "이전 값 → 새 값"을 표로 적는다.
7. 새 npm 패키지를 추가하면 PR에 이유를 적는다.
8. 큰 작업은 시작 전에 계획을 짧게 보여주고 오너 확인을 받는다.
9. 커밋 메시지는 한국어 한 줄.

## PR 설명 양식
`.github/pull_request_template.md`를 따른다. 쉬운 말로 쓴다.

## 리뷰 요청을 받았을 때
버그 가능성, 요청 범위를 벗어난 변경, 이 문서의 규칙 위반, 손맛 기준값 변경 여부를 중심으로 본다. 자바스크립트 기초만 아는 사람이 이해하게 설명하고, 문제는 "어떤 상황에서 무엇이 잘못되는지"로 말한다.

## 명령어 (1단계에서 만들 것)
- `npm run dev` 개발 서버 · `npm run build` 빌드 · `npm run preview` 빌드 확인
- `npm run typecheck` 타입 검사 · `npm test` 단위 테스트
