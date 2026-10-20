# 디자인 (Design)

| 문서·파일 | 내용 |
|---|---|
| 이 문서 | 디자인 시스템 — 색 토큰, 타이포, 컴포넌트, 아이콘 사용 규칙, 에셋 적용 지도 |
| [art-direction.md](art-direction.md) | 아트 디렉션 — 현재 스타일 분석과 앞으로의 방향 |
| [design-board.html](design-board.html) / [design-board.png](design-board.png) | 실제 사용 중인 아이콘·색·후보 에셋 한 장 보기 (`npm run dev` 후 `/wiki/design/design-board.html`) |
| [assets/](assets/) | 후보 에셋 (Kenney 파티클·타일·샘플) + [CREDITS.md](assets/CREDITS.md) |
| [`art/`](../../art/README.md) | 픽셀 아트 원본 팩 (Ninja Adventure 전체, 0x72 DungeonTileset II). 여기에 없으면 [Universal LPC 생성기](https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator)도 본다. 게임은 필요한 프레임만 복사해 씀 |
| [screenshots/](screenshots/) | 현재 화면 캡처 |

![design board](design-board.png)

## 1. 색 토큰

| 용도 | 값 | 출처 |
|---|---|---|
| 월드 배경 | `#0a0a12` | `CONFIG.worldBgColor` |
| UI 배경 / 패널 / 선 | `#020617` / `#0f172a` / `#1e293b` | Tailwind slate-950/900/800 |
| 플레이어(기본) | `#22d3ee` + 외곽 `#0e7490` | `CONFIG.player`, 캐릭터별 `CHARACTERS[].color` |
| 경험치 | `#3b82f6` → 병합 단계 보라·초록·분홍·금 | `GemManager` |
| 엘리트·보물·골드 | `#fbbf24` | `CONFIG.elite.color` |
| 무기 7색 | 라이플 `#fbbf24` · 회전검 `#f472b6` · 폭발탄 `#fb923c` · 트랩 `#34d399` · 오오라 `#f87171` · 비도 `#c4b5fd` · 발톱 `#84cc16` | `CONFIG.weapons[].color` |
| 장신구 9색 | `ui/theme.ts` 의 `ACCESSORY_COLORS` | 단일 출처 |
| HP | >50% `#22c55e` · >25% `#eab308` · 그 이하 `#ef4444` | HUD |
| 강조 | 시안(진행·선택) · 호박(강화·진화) · 보라(장신구·기억·돌파) · 에메랄드(신규·특성) · 로즈(위험·업적) | 화면 공통 |

**어두운 캐릭터 색**(리냐 `#1f2937`)은 UI 아이콘·테두리에서 `readableAccent()` 로 밝게 보정한다. 게임 속 원 색은 그대로.

## 2. 타이포그래피

- 본문: 시스템 산세리프(Tailwind 기본, 한글 맑은 고딕 폴백). 별도 웹폰트 없음(오프라인 exe, 용량).
- 숫자: `font-mono` + `tabular-nums` (HUD·비용·통계) — 자릿수가 바뀌어도 흔들리지 않게.
- 제목: `font-extrabold tracking-tight` / 부제·라벨: `uppercase tracking-widest`.

## 3. 컴포넌트

| 컴포넌트 | 파일 | 규칙 |
|---|---|---|
| `GameIcon` | `src/ui/components/GameIcon.tsx` | SVG를 CSS mask 로 틴트. `color` 미지정 시 글자색 상속 |
| `SettingsPanel` | `src/ui/components/SettingsPanel.tsx` | 일시정지 메뉴·로비 설정 공용 |
| `EnemyShape` | `src/ui/components/EnemyShape.tsx` | 게임 속 적 도형 그대로(도감 표기) |
| 카드 | 각 화면 | `rounded-xl/2xl border-2` + 상태별 테두리색, 호버 `scale-[1.02]` |
| 배지 | 레벨업 카드 | NEW(에메랄드/보라) · UP(호박/보라) · EVOLVE(금 채움) |
| 재화 칩 | 로비·각 화면 헤더 | 아이콘 + 모노 숫자 + 단위 |

## 4. 아이콘 사용 규칙

- 원본: `src/assets/icons/*.svg` (단색, `fill="currentColor"`, 배경 없음, 512×512).
- 의미 매핑은 **`src/assets/icons/map.ts` 한 곳** (`weaponIcon`, `accessoryIconName`, `enemyIcon`, `characterIcon`, `traitIcon`, `UI_ICONS`).
- UI: `<GameIcon name=… color=… size=…/>` · 캔버스: `getIconSprite(name, color, size)` (틴트+외곽선을 한 번 굽고 캐시).
- 크기: HUD 14–18 · 카드 24–32 · 상세 헤더 36–40 · 대표 이미지 56–72.
- 새 아이콘: game-icons.net 에서 고르고 `credits.json` 에 작가 추가, 로비 크레딧 줄 갱신.

## 5. 에셋 적용 지도 (어디에 무엇이 들어갔나)

| 화면 / 위치 | 에셋 |
|---|---|
| 로비 메뉴 6개 | `menu-*` |
| 로비 상단 | `stat-gold`, `ui-star`, 보유 캐릭터 걷기 파티 줄(픽셀), 선택 캐릭터 초상 `faces/char-*` + 시작 무기 `weapon-*` |
| 로비 하단 | 버전 + 아이콘 작가 크레딧 |
| HUD | `stat-time`, `stat-kills`, `stat-score`, `ui-upgrade`(레벨), `ui-reroll`, 무기 `weapon-*(-evo)`, 장신구 `acc-*`, 빈 슬롯 프레임 |
| 레벨업 카드 | 무기/진화/장신구 아이콘 + 배지, 리롤 `ui-reroll` |
| 일시정지 | 설정 패널(lucide 스피커) |
| 게임오버 | 통계 아이콘 4종, 골드·별, 달성 업적 진화 무기 아이콘, 이번 판 무기 목록 |
| 캐릭터 관리 | 초상 `faces/char-*`(미보유는 회색), 상세는 걷기 애니메이션, 시작 무기 아이콘, `ui-memory`, `ui-breakthrough` |
| 뽑기 | `menu-gacha`, 굴리는 동안 무작위 초상 깜빡임, 결과 카드 걷기 애니메이션, `stat-gold` 비용 |
| 특성 | `trait-*` (강화된 특성은 초록) |
| 도감 | 적 초상 `faces/enemy-*` / 늑대 스프라이트, 상세에 "게임 내 모습"(걷기) + "저사양 모드"(도형), 무기·진화·장신구 아이콘 |
| 업적 | 진화 무기 아이콘(미달성은 회색 + 자물쇠), `ui-star` 보상 |
| 캔버스 — 표식 | 보물 상자 `ui-treasure`, 엘리트 왕관 `ui-crown`, 플레이어 원 안 `char-*` 엠블럼, 적 도형 안 `enemy-*` 엠블럼(저사양 끔) |
| 캔버스 — 무기 | 회전검 `proj-blade` 칼날, 비도 `proj-dagger`(회귀 중에도 같은 비도), 폭발탄 `weapon-bomb`/운석 `weapon-bomb-evo`, 트랩 `weapon-trap`/토템 `weapon-trap-evo` |
| 캔버스 — 이펙트 (Kenney, 저사양 끔) | 처치 `star`, 레벨업 `light_02`, 라이플 총구 `muzzle_02`, 폭발 `fire_01`, 잔불 `flame_01` |
| 캔버스 — 월드 장식 (저사양 끔) | `decor-*` 10종(풀·돌·뼈·해골·버섯·비석·고목·거미줄·꽃·바위)을 280px 칸마다 해시로 배치, 배경보다 살짝 밝은 실루엣 (타일 월드 로딩 전에만) |
| **캔버스 — 높음 품질 (픽셀 아트, `src/assets/pixel`)** | 월드 `tiles/floor·nature·detail` 청크 · 플레이어 `units/char-*` 4방향 걷기 · 적 `units/enemy-*` (+엘리트 금빛) · 그림자 `units/shadow` · 경험치 보석은 푸른 구체(뭉칠수록 진한 파랑) · 상자 `items/chest` · 라이플 `proj/energy-ball` · 비도 `proj/kunai` · 회전검 `items/sword`/`items/big-sword` · 폭발탄 `proj/canonball`/`proj/fireball` + `fx/circle-orange`·`fx/smoke`, 잔불 `fx/fire` · 트랩 `fx/circle-spark`(+`fx/thunder`) · 오오라 `fx/fire` 고리 · 발톱 `fx/claw` · 브레스 `fx/fire` 입자 · 처치 `fx/smoke`(+`fx/spark`) |

## 6. 스크린샷

| | |
|---|---|
| ![lobby](screenshots/01-lobby.jpg) | ![game](screenshots/02-gameplay.jpg) |
| ![levelup](screenshots/03-levelup.jpg) | ![pause](screenshots/04-pause.jpg) |
| ![characters](screenshots/05-characters.jpg) | ![gacha](screenshots/06-gacha.jpg) |
| ![traits](screenshots/07-traits.jpg) | ![codex](screenshots/08-codex.jpg) |
| ![evolution](screenshots/09-codex-evolution.jpg) | ![gameover](screenshots/10-gameover.jpg) |
| ![pixel gameplay](screenshots/11-pixel-gameplay.jpg) | ![pixel units](screenshots/12-pixel-units.jpg) |
| ![pixel world (4× zoomed out)](screenshots/13-pixel-world.jpg) | ![low quality](screenshots/14-low-quality.jpg) |

01–10 은 v0.1(현재 저사양 룩과 같은 그림) 화면, 11–13 은 v0.2 높음 품질(픽셀 아트), 14 는 같은 장면의 저사양 품질.
