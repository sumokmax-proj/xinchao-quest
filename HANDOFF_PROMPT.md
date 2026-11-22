안녕! 이 저장소는 내가 만드는 베트남어 학습 게임 "씬짜오 퀘스트"야. Claude 채팅에서 기획과 프로토타입까지 마쳤고, 오늘부터 여기서 이어서 개발하려고 해.

## 먼저 읽어줘
1. `CLAUDE.md` (작업 규칙, 게임 핵심 규칙, 손맛 기준값)
2. `docs/decisions-log.md` (지금까지 결정한 것과 이유)
3. `docs/game-design.md` (기획안)
4. `prototype/action-3d.html` (한 파일 Three.js 프로토타입. 직접 해봤는데 생각보다 상당히 재밌었어. 이게 손맛의 기준이야)

`prototype/quiz-2d.html`은 초기 2D 버전이라 보관용이야. 참고하지 않아도 돼.

## 지금 상황 요약
- 게임: 세로 화면 3D 탑뷰 그리드 액션. 고블린 쪽으로 이동하면 자동 공격(범프), 빨간 예고 칸은 피하고, HP 0이 된 고블린 머리 위 2지선다 베트남어 퀴즈를 ← / → 로 맞혀야 처치. 틀리면 고블린이 HP 15% 회복.
- 나는 QC 매니저라 코드를 직접 짜지는 않아. 자바스크립트 기초는 이해하니까 설명은 쉽게 해줘.
- 지금은 웹/앱 Claude Code로 작업하고, 나는 결과를 배포된 페이지에서 폰으로 플레이해서 확인할 거야. 그래서 GitHub Pages 자동 배포가 꼭 필요해.

## 1단계 작업: 프로토타입을 프로젝트로 이식 (기능 추가 없이)
1. Vite + TypeScript + three(npm) 프로젝트로 세팅. 세로 화면, 모바일 우선.
2. `prototype/action-3d.html`의 동작을 그대로 옮기기. CLAUDE.md의 폴더 구조를 따르되, 처음부터 너무 잘게 쪼개지는 말고 Player / Goblin / Grid / QuizSystem / UI 정도부터.
3. 밸런스 수치는 전부 `src/config.ts`로. 값은 CLAUDE.md의 "손맛 기준값"과 같게.
4. `data/words.json`을 `src/data/`로 옮기고, 웨이브는 `src/data/waves.json`, 맵은 `src/data/maps/field-01.json`으로 분리.
5. 그리드 이동·점유, 데미지, 퀴즈 판정, 오답 회복, 웨이브 진행은 three와 분리된 순수 로직으로 만들고 vitest 단위 테스트 붙이기.
6. `npm run dev / build / preview / typecheck / test` 스크립트.
7. GitHub Actions로 `main`에 merge되면 GitHub Pages에 자동 배포. Vite `base`는 저장소 이름에 맞춰줘.
8. README의 프로토타입 표 아래에 "플레이 링크" 자리 만들어두기.

## 진행 방식
- 시작 전에 계획(파일 목록, 순서)을 짧게 보여주고 내 OK를 받아줘.
- 새 브랜치에서 작업하고, `.github/pull_request_template.md` 양식으로 PR 올려줘.
- build, typecheck, test가 모두 통과한 상태로 올려줘.
- PR의 "오너가 폰으로 확인할 것"에는 프로토타입과 똑같이 느껴지는지 확인할 항목을 구체적으로 적어줘 (이동 속도, 공격 간격, 빨간 예고 타이밍, 퀴즈 5초, 오답 시 회복, 대장 2문제, 도트 모드 등).
- 프로토타입과 달라진 점이 있으면 PR에 솔직하게 적어줘.
- GitHub 설정에서 내가 직접 눌러야 하는 게 있으면(예: Pages 소스를 GitHub Actions로 바꾸기) 어디를 눌러야 하는지 단계별로 알려줘.

## 다음 단계 예고 (지금은 하지 마)
2. 로폴리 에셋 적용 (KayKit 등 CC0), 걷기·공격·빈사 애니메이션
3. 모바일 조작 다듬기, 단어 50개로 확장
4. 마을 허브(상점, 오답노트 화면, 포털), 지역·보스 추가
5. 듣기 문제(TTS), 빈칸 채우기(대장 전용)
6. Supabase 저장
