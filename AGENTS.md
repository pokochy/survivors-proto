# AGENTS.md — AI 에이전트 작업 지침

> 이 저장소에서 작업하는 모든 AI 코딩 에이전트(Claude Code, Codex, Cursor, Copilot, Gemini CLI 등)와
> 사람이 **가장 먼저 읽는 문서**. 사람용 소개는 [README.md](README.md), 깊은 지식은 [wiki/](wiki/README.md).
> 사용자가 채팅으로 직접 준 지시가 이 문서보다 우선한다.

## 0. 30초 요약

- Bolt.new 로 만든 **뱀서라이크 브라우저 로그라이트**(React + TypeScript + Canvas 2D). 개발은 주로 AI가 한다.
- 수정 전: 고칠 폴더의 `README.md` → 관련 파일만 열기. 수정 후: **`npm run check`** (타입·린트·헤드리스 시뮬·빌드).
- 게임성(규칙·밸런스·컨셉)은 바꾸지 않는다. 원작자 의도: [wiki/overview/original-intent-audit.md](wiki/overview/original-intent-audit.md)
- 업데이트는 한 곳만 고치면 되게, 렌더링은 저사양 우선.
- 배포하지 않는 토이 프로젝트 — CI·릴리스·자동 업데이트 없음.

## 1. 최우선 원칙

### 1-1. 게임의 성격을 바꾸지 않는다 — 기술적 개입이 기본값
- 장르·조작·핵심 루프·콘텐츠 구성·**밸런스 수치**·무기 컨셉은 **사용자가 요청할 때만** 바꾼다.
- 기본 작업 범위: 구조, 성능, 버그(설명·원작자 발언과 구현이 어긋난 것 포함), UI, 디자인 에셋, 도구, 문서.
- 수정이 밸런스를 크게 움직이면 고치기 전에 [wiki/direction/known-issues.md](wiki/direction/known-issues.md) 에 남기고 확인받는다.
- 원작자 취향: **또렷함**(잔상·모션블러·반투명 엔티티 싫어함), "수치만 오르는" 성장보다 **레벨별 특수 효과**, 진화형은 **최종형**.
- UI 문구는 한국어, 기존 톤(짧고 게임스러운 문장).

### 1-2. 업데이트가 편해야 한다 (Update-friendly by default)
모든 변경은 "다음 사람이 콘텐츠·밸런스·그림을 **한 곳만 고쳐서** 갱신할 수 있는가?"를 기준으로 한다.

| 바꿀 것 | 한 곳 |
|---|---|
| 수치 | `src/game/data/config.ts` (그 후 `npm run docs:spec`) |
| 진화 | `src/game/data/evolutions.ts` |
| 캐릭터·특성·업적·비용 | `src/game/data/progression.ts` |
| 무기 동작 | `src/game/weapons/<Name>Weapon.ts` + `weapons/registry.ts` 등록 (종류별 `switch` 새로 만들지 말 것) |
| 그림 (아이콘·저사양) | `src/assets/icons/<name>.svg` + `src/assets/icons/map.ts` |
| 그림 (픽셀 아트·높음 품질) | `scripts/sync-pixel-assets.mjs` 목록 한 줄 → `npm run assets:pixel` (+ 스트립이면 `src/assets/pixel/catalog.ts` 프레임 폭). 원본 팩은 `art/` |
| 색 | 무기: `config.ts`, 장신구: `src/ui/theme.ts` |
| 세이브 구조 | `src/game/core/storage.ts` — `SAVE_SCHEMA_VERSION` + `MIGRATIONS` (`STORAGE_KEY` 변경 금지) |
| 설정(품질·음량) | `src/game/core/settings.ts` |
| 제목·버전 | `src/gameInfo.ts`, `package.json` |

사용자에게 보이는 변경은 `CHANGELOG.md` 의 `Unreleased` 에 한 줄.

### 1-3. 하드웨어를 많이 요구하는 렌더링을 피한다 (Low-spec first)
목표: 내장 그래픽 노트북(1366×768)에서 60fps. 근거: [wiki/methodology/canvas-performance.md](wiki/methodology/canvas-performance.md)

| 금지 / 지양 | 대신 |
|---|---|
| `ctx.shadowBlur`, `ctx.filter` 매 프레임 | 반투명 굵은 선 halo / 오프스크린에 1회 적용 |
| 매 프레임 큰 그라디언트 | `render/sprites.ts` `getRadialSprite()` |
| 매 프레임 SVG·이미지 틴트 | `render/iconSprites.ts` `getIconSprite()` (한 번 굽고 캐시) |
| 같은 스타일 선을 여러 번 `stroke()` | 한 path 에 모아 1번 |
| 정지 중 재렌더, 루프 안 객체 대량 생성 | 정지 화면 1장(`frozenFrameDrawn`), in-place 컬링 |
| WebGL·고해상도 업스케일·상시 `backdrop-filter` | 960×720 고정 캔버스 + CSS 스케일 |

- 장식은 `isLowQuality()` 로 감싼다. 게임 정보(공격 범위·적·투사체·HP·엘리트 왕관·보물 상자)는 항상 그린다.
- **품질 = 두 가지 룩.** 높음 = 픽셀 아트(`render/pixel.ts`, `render/tileWorld.ts`, `src/assets/pixel`), 저사양 = v0.1 벡터 룩 그대로.
  render 함수는 `if (!isLowQuality() && <픽셀 경로 성공>) return/continue;` 다음에 원래 코드를 둔다 (로딩 중 자동 폴백). 저사양 경로는 고치지 않는다.
- 픽셀 아트는 `imageSmoothingEnabled=false` 로 그리고 복구, 타일 바닥은 청크 캐시만 쓴다(타일 단위 매 프레임 그리기 금지).
- 이펙트는 `render/effects.ts` 에 — 개수 상한, 짧은 수명, 저사양 생략.
- 엔티티는 항상 불투명. 그리는 순서: 배경 → 보석 → 적 → 이펙트 → 엘리트 표식 → 무기 → 플레이어.

### 1-4. AI가 개발하기 편하게
- 작은 파일, 한 파일 한 책임. 폴더마다 `README.md` (새 폴더를 만들면 README도).
- **주석은 영어로 써도 된다.** 기존 한국어 주석은 일부러 번역하지 않는다.
- 파일 머리에 `// ====` 배너 + 한 줄 역할 설명. 주석은 "왜"를 적는다.
- 생성 가능한 문서는 생성한다(`docs:spec`). 손으로 같은 표를 두 번 쓰지 않는다.
- 게임 모듈 최상단에서 `document`/`new Image()` 를 쓰지 않는다 — 헤드리스 시뮬(`npm run sim`)이 깨진다. 이미지는 첫 render 때 지연 로딩.

## 2. 명령어

```bash
npm install          # 의존성
npm run dev          # 개발 서버 http://localhost:5173
npm run check        # typecheck + lint + sim(3분) + build — 커밋 전 반드시 통과
npm run sim          # 헤드리스 게임플레이 회귀 테스트 (캐릭터 7명 × 6분, 레벨업 큐·소프트락 검사)
npm run docs:spec    # 위키 수치표 재생성
npm run build:exe    # release/SurvivorsProto.exe (Windows 전용)
```

UI·시각 변경은 `npm run dev` 에서 직접 확인한다 (렌더링은 sim 범위 밖).

## 3. 구조와 의존 방향

```
art/                          CC0 픽셀 팩 원본 라이브러리 (코드가 직접 import 하지 않음)
src/
├─ main.tsx · App.tsx         진입점, 화면 전환(state)
├─ gameInfo.ts                제목·버전 (단일 출처)
├─ launcherBridge.ts          원클릭 exe 연결 (ping/bye/세이브 미러)
├─ assets/
│  ├─ icons/                  SVG 74종 + index.ts(이름→URL) + map.ts(의미 매핑) + credits.json
│  ├─ fx/                     캔버스 이펙트 텍스처 (Kenney CC0)
│  └─ pixel/                  픽셀 아트 59종 (생성물: npm run assets:pixel) + index.ts + catalog.ts(슬라이스·id 매핑)
├─ game/                      ── React 없이 동작하는 순수 게임 로직 ──
│  ├─ core/      GameEngine(루프·통합·레벨업 큐·일시정지) · types · storage · settings · audio
│  ├─ data/      config(밸런스) · evolutions · progression
│  ├─ entities/  Player · EnemyManager · GemManager
│  ├─ systems/   WeaponManager · AccessoryManager · upgrades · traitHelper
│  ├─ weapons/   무기 7종 + registry.ts(등록표)
│  └─ render/    quality · sprites · iconSprites · effects · background · decor · pixel · tileWorld
└─ ui/                        ── React 화면 ──
   ├─ screens/   Lobby · GameCanvas · Gacha · Character · Traits · Codex · Achievements
   ├─ components/ HUD · UpgradeModal · SettingsPanel · GameIcon · EnemyShape · PixelSprite(초상·걷기)
   ├─ hooks/     useSettings
   ├─ icons.ts   (assets/icons/map.ts 재노출)
   └─ theme.ts   장신구 색, 무기 색, readableAccent
```

**의존 규칙**
- `game/**` 는 `ui/**`·React 를 import 하지 않는다. UI와는 `GameEngine` 공개 메서드 + `GameCallbacks` 로만.
- `assets/**` 는 game·ui 양쪽에서 쓸 수 있다(데이터·URL만, 로직 없음).
- `game/data/**` 는 로직 모듈을 import 하지 않는다(타입 제외).
- 모든 import 는 `@/` 별칭. 새 UI 라이브러리 금지(Tailwind + lucide-react + `GameIcon`).

## 4. 작업별 체크리스트

### 새 무기
1. `game/core/types.ts` — `WeaponType` 유니온
2. `game/data/config.ts` — `weapons.<id>` (name, desc, color, base*, *Growth, maxLevel)
3. `game/data/evolutions.ts` — 진화 (짝 장신구·이름·설명·배율). 진화형 수치 = **최대 레벨 수치 × 배율**
4. `game/weapons/<Name>Weapon.ts` — update/render/levelEffect (+ `reset*Ids`), 진화 분기 `w.evolved`
5. `game/weapons/registry.ts` — 어댑터 + `WEAPON_MODULES` 등록 (`renderOrder`)
6. `game/data/progression.ts` — 업적 `evo_<id>`, `StartWeaponType`
7. 아이콘 `src/assets/icons/weapon-<id>.svg`, `weapon-<id>-evo.svg` (+ `credits.json`)
8. `scripts/gen-spec.mjs` — `weaponTables` 에 수치표 함수
9. `npm run check` → `npm run docs:spec` → CHANGELOG

### 새 장신구
`types.ts` `AccessoryType` → `config.ts` `accessories` → `AccessoryManager` (`ALL_ACCESSORY_TYPES`·`computeMods`·`getLevelEffect`) → `ui/theme.ts` 색 → 아이콘 `acc-<id>.svg` → docs:spec

### 새 적
`config.ts` `enemyTypes` (등장 시간·가중치·모양) → 도감 설명 `CodexScreen.tsx` `ENEMY_DESCS` → 아이콘 `enemy-<id>.svg`(저사양)
→ 픽셀 시트·초상 `units/enemy-<id>`, `faces/enemy-<id>` (`scripts/sync-pixel-assets.mjs` 에 한 줄, `npm run assets:pixel`).
스프라이트 적은 늑대 구현(16×16 시트, 지연 로딩)을 따른다.

### 새 캐릭터
`progression.ts` `CHARACTERS` (패시브는 `PassiveType` + `GameEngine.updateWeaponMods`/`applyAccessoryMods`) → 엠블럼 `char-<id>.svg`(저사양)
→ 픽셀 걷기 시트·초상 (`scripts/sync-pixel-assets.mjs` 캐릭터 목록에 `[id, Ninja Adventure 폴더명]`, `npm run assets:pixel`).
팩에 없으면 [Universal LPC Spritesheet Character Generator](https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator) 에서도 찾는다. 레이어 라이선스는 그 저장소 `CREDITS.csv` 를 보고, 쓴 레이어만 크레딧한다.
특수 캐릭터는 `special: true` + `unlockAchievement`.

### 새 아이콘·에셋
game-icons.net(CC BY 3.0) 또는 Kenney(CC0)만. SVG 는 단색 `fill="currentColor"`, 배경 제거, 스크립트·외부 참조 없음.
`credits.json` + `wiki/design/assets/CREDITS.md` + (새 작가면) 로비 크레딧 줄 갱신.

### 세이브 구조 변경
`storage.ts`: `SAVE_SCHEMA_VERSION`++ → `MIGRATIONS[이전]` → `normalize` 기본값. 실행기 디스크 백업은 같은 JSON 이라 추가 작업 없음.

### 원클릭 실행기(launcher/)
`Launcher.cs` 는 **C# 5 문법만** (Windows 기본 csc.exe). 문자열 보간·`?.`·`nameof`·`out var` 금지.
포트 후보·프로필 경로를 이유 없이 바꾸지 않는다(디스크 미러로 복구는 됨).

## 5. 문서 유지 규칙

| 바꾼 것 | 같이 갱신 |
|---|---|
| 수치 | `npm run docs:spec` |
| 시스템 규칙 | `wiki/specs/*.md` |
| 방향·결정 | `wiki/direction/README.md` 결정 기록 |
| 설계-구현 불일치·밸런스 의심 | `wiki/direction/known-issues.md` |
| 렌더링 기법 | `wiki/methodology/canvas-performance.md` |
| 에셋 | `wiki/design/README.md` 적용 지도 + CREDITS |
| 새 폴더 | 그 폴더 `README.md` + 이 문서 3장 |

## 6. Git

- Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `perf:`). `main` 강제 푸시 금지.
- `release/`, `dist/`, `launcher/obj/` 는 커밋하지 않는다.

## 7. 지식 지도

[wiki/README.md](wiki/README.md) — 개요·원작자 의도 대조 / 기능 명세(+자동 수치표) / 레퍼런스 / 방법론 / 커뮤니티 / 방향성 / 디자인
