# 프로젝트 내력 — "이 폴더는 무엇이었나"

## 출발점 (2026-10-19 확인)

- 위치: `Downloads/project-bolt-sb1-mwjsmrcu/project` — **Bolt.new** (StackBlitz의 AI 웹앱 생성기)에서 내려받은 프로젝트.
  - 근거: `.bolt/config.json` 의 템플릿 `bolt-vite-react-ts`, `.bolt/prompt` 의 Bolt 기본 지시문,
    `index.html` 의 bolt.new OG 이미지, 폴더 이름 패턴 `project-bolt-sb1-*`.
- 정체: **"Vampire Survivors Style Game Prototype"** (원래 `<title>`). 로비 제목도 "Vampire Survivors / PROTOTYPE".
- 상태: git 없음, README 없음, 타입체크·빌드는 통과, ESLint 오류 23건, 사용하지 않는 Supabase 의존성,
  `assets/` 와 `public/assets/` 에 같은 이미지 중복, 일부 주석 문자 깨짐("돌파" → `㴼ヂ`).

## 원본이 이미 갖추고 있던 것

| 영역 | 내용 |
|---|---|
| 인게임 | 무한 월드 이동, 자동 공격 무기 7종(레벨 1–8 + 진화), 장신구 9종, 적 7종 + 엘리트, 경험치 보석 병합, 레벨업 3지선다 + 리롤, 보물 상자 |
| 메타 | 골드, 캐릭터 7명(뽑기·레벨·각성·돌파·기억), 특성 7종, 진화 업적 7개(특수 캐릭터 해금), 도감 |
| 기술 | React + Canvas 2D, 엔진은 React와 분리된 모듈 구조, localStorage 세이브, WebAudio 합성음 |

→ 이미 "플레이 가능한 수직 단면(vertical slice)" 수준이다. 그래서 이번 정리는 **게임을 바꾸지 않고**
구조·성능·배포·문서를 갖추는 데 집중했다.

## 이번 정리에서 한 일 (v0.1.0)

| 분류 | 변경 | 이유 |
|---|---|---|
| 구조 | `src/game/{core,data,entities,systems,weapons,render}` + `src/ui/{screens,components,hooks}` | 역할별로 찾기 쉽게, 다른 AI가 붙어도 길을 잃지 않게 |
| 확장성 | 무기 등록표, 레벨업 로직 분리, 세이브 스키마 버전, `gameInfo.ts` | 업데이트를 한 곳 수정으로 |
| 성능 | FPS 상한, 일시정지 재렌더 중단, shadowBlur 제거, 그라디언트 캐시, 그리드 패턴, 불투명 캔버스, 자동 저사양 | 저사양 PC 대응 |
| 실행 | 원클릭 exe(~0.4MB) + 디스크 세이브 미러 | 설치 없이 실행 |
| UI·에셋 | 아이콘 74종 전 화면 적용, 캔버스 표식(상자·왕관·엠블럼), 일시정지·설정 | 디자인 에셋 적용, 사용성 |
| 버그 | 진화 수치, 레벨업 누락·소프트락, 키 고착 등 | 원작자 의도 복원·안정성 ([대조표](original-intent-audit.md)) |
| 문서·도구 | AGENTS.md, 디렉토리별 README, 이 위키, 자동 수치표, 헤드리스 시뮬레이션 | AI 인수인계·검증 |
| 이름 | 로비 제목 "Vampire Survivors" → "Survivors" (`src/gameInfo.ts`) | 공개 저장소에서 타 게임 상표를 제목으로 쓰지 않기 위해. 한 줄로 되돌릴 수 있다 |

변경 상세: [CHANGELOG.md](../../CHANGELOG.md) · 커밋 이력 (`git log`) 첫 커밋이 원본 그대로의 스냅샷이다.

## v0.3.0 (2026-10-20) — 제약과 엘리트 제한 시간

로비에 설정·제약 메뉴를 넣었다. 제약이 셀수록 판이 끝난 뒤 골드가 늘어난다.
엘리트는 30초 안에 잡지 못하면 게임오버가 된다. 특수 드롭, 출현 곡선, 잔류 화염도 같이 조정했다.
세이브는 스키마 3으로 올리고, 예전 세이브에는 제약 단계를 빈 값으로 붙인다.

## v0.2.0 (2026-10-20) — 그래픽 개편

사용자 요청으로 높음 품질의 그래픽을 16px 픽셀 아트(Ninja Adventure, CC0)로 바꿨다 — 타일 월드, 유닛 걷기 스프라이트,
에셋 기반 공격 이펙트, UI 초상. 게임 규칙·수치는 그대로이고, **저사양 품질은 v0.1 의 모습을 그대로 유지**한다.
결정 기록: [art-direction.md](../design/art-direction.md)

## 하지 않은 것 (의도적으로)

- 밸런스 수치, 무기·적·캐릭터 구성, 화면 흐름 변경. (v0.1 에선 기하 도형 스타일도 유지했고, v0.2 에서 사용자 요청으로 높음 품질만 픽셀 아트로 바꿨다)
- CI·릴리스·자동 업데이트 (배포하지 않는 토이 프로젝트).
- 원작자 로그와 어긋나 있던 구현(진화 수치 등)은 고쳤고, 컨셉 판단이 필요한 것은
  [direction/known-issues.md](../direction/known-issues.md) 에 남겼다.
