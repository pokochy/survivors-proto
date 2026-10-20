# src/ui/ — React 화면

| 폴더/파일 | 내용 |
|---|---|
| `screens/Lobby.tsx` | 메뉴 카드 8개(게임 시작·제약·뽑기·캐릭터·특성·도감·업적·설정), 재화·선택 캐릭터, 버전·아이콘 크레딧 |
| `screens/ConstraintScreen.tsx` | 제약 단계와 점수, 완료 골드 배율 |
| `screens/SettingsScreen.tsx` | 그래픽·효과음 (설정은 세이브와 별도) |
| `screens/GameCanvas.tsx` | 캔버스 + 엔진 생성/정리, 입력, 단계(playing/levelup/paused/gameover), ESC·포커스 상실 일시정지, 골드·업적 정산, 화면 높이 맞춤 |
| `screens/GachaScreen.tsx` | 뽑기(1회/10연), 엠블럼 연출, 연타·중도 이탈 방지 |
| `screens/CharacterScreen.tsx` | 캐릭터 선택·레벨업·각성(별)·돌파·초기화 |
| `screens/TraitsScreen.tsx` | 특성 강화·초기화 |
| `screens/CodexScreen.tsx` | 도감 (적: 아이콘 + 실제 도형 / 무기 / 진화 / 장신구) — 레벨 효과는 무기 등록표에서 |
| `screens/AchievementsScreen.tsx` | 업적 (진화 무기 아이콘) |
| `components/HUD.tsx` | 시간·처치·스코어·레벨·XP·HP·리롤·무기/장신구 칩·빈 슬롯 |
| `components/UpgradeModal.tsx` | 레벨업 3지선다 + 리롤, 배지(NEW/UP/EVOLVE), 단축키 1/2/3·R, 대기 수 표시 |
| `components/SettingsPanel.tsx` | 그래픽 품질·효과음 (일시정지 메뉴·설정 화면 공용) |
| `components/GameIcon.tsx` | SVG 아이콘을 CSS mask 로 틴트 |
| `components/EnemyShape.tsx` | 게임 속 적 도형 SVG (저사양 모드의 모습) |
| `components/PixelSprite.tsx` | `PixelFace`(38×38 초상) · `PixelWalker`(4프레임 걷기, CSS steps) — `src/assets/pixel`, 없으면 SVG 엠블럼 폴백 |
| `hooks/useSettings.ts` | `core/settings.ts` React 바인딩 |
| `icons.ts` | `assets/icons/map.ts` 재노출 |
| `theme.ts` | 장신구 색, 무기 색, `readableAccent()` |

## Rules

- Tailwind + `lucide-react` (generic UI glyphs) + `GameIcon` (game things). No new UI libraries.
- No game logic in UI — call engine/data functions.
- Colors/icons only via `theme.ts` / `assets/icons/map.ts`.
- When a callback from the engine may fire synchronously inside an engine call (e.g. `applyUpgrade` opening the
  next level-up), update React state *before* the call.
