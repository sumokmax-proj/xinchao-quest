# 씬짜오 퀘스트 (Xin Chào Quest)

베트남어를 공부하는 동기부여 게임. 고블린을 베고, 마지막 일격은 베트남어 퀴즈로 끝낸다.

- 장르: 3D 탑뷰 실시간 그리드 액션 RPG (세로 화면, 한 손 조작)
- 조작: 상하좌우로 한 칸씩 이동, 고블린 쪽으로 이동하면 자동 공격, 빨간 바닥은 피하기, 빈사 고블린 머리 위 퀴즈는 ← / → 로 답하기
- 기술: Vite + TypeScript + Three.js, GitHub Pages 배포

## 문서
| 문서 | 내용 |
| --- | --- |
| [docs/game-design.md](docs/game-design.md) | 기획안 |
| [docs/decisions-log.md](docs/decisions-log.md) | 지금까지의 결정, 남은 질문 |
| [docs/reference-games-research.md](docs/reference-games-research.md) | Rumble Heroes · Guidus 레퍼런스 조사 |
| [docs/story-concept.md](docs/story-concept.md) | 스토리·컨셉 구상 (나중에 개발) |
| [docs/workflow.md](docs/workflow.md) | 브랜치·PR·리뷰 하는 법 (오너용 안내) |
| [CLAUDE.md](CLAUDE.md) | Claude Code 작업 규칙 |

## 프로토타입
| 파일 | 내용 |
| --- | --- |
| [prototype/action-3d.html](prototype/action-3d.html) | 현재 방향. 3D 그리드 범프 공격 + 빈사 퀴즈 (손맛 기준) |
| [prototype/quiz-2d.html](prototype/quiz-2d.html) | 초기 버전. 2D 턴제 퀴즈 전투 (보관용) |

브라우저에서 파일을 바로 열면 플레이할 수 있다.

## 플레이 링크
| 버전 | 링크 |
| --- | --- |
| 최신 (`main`) | https://sumokmax-proj.github.io/xinchao-quest/ |

`main`에 push되면 GitHub Actions가 자동으로 빌드해서 위 주소에 배포한다 (2~3분). 시작 화면 부제에 버전(v0.1 등)이 보인다.

## 개발 명령어
```bash
npm install        # 처음 한 번
npm run dev        # 개발 서버
npm run build      # 배포용 빌드 (dist/)
npm run preview    # 빌드 결과 미리보기
npm run typecheck  # 타입 검사
npm test           # 단위 테스트
npm run playtest   # 자동 플레이 점검 (봇이 끝까지 플레이, 결과는 playtest-output/)
```
