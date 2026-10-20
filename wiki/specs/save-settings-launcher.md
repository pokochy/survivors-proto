# 세이브 · 설정 · 원클릭 실행기

> 코드: `src/game/core/storage.ts`, `src/game/render/quality.ts`, `src/launcherBridge.ts`, `launcher/Launcher.cs`, `src/ui/hooks/useUpdateCheck.ts`

## 세이브 (localStorage `vs_proto_save`)

```ts
interface SaveData {
  schemaVersion: number;          // 현재 3
  gold: number;
  owned: { id, level, stars, memories, breakthrough }[];
  traitLevels: Record<string, number>;
  selectedCharacter: string;
  stars: number;                  // 각성 재화
  completedAchievements: string[];
  constraintLevels: Record<string, number>; // 제약 단계. 0 은 해제
  updatedAt?: number;             // 저장 시각 (실행기 디스크 백업과 비교)
}
```

### 마이그레이션

| 버전 | 변경 |
|---|---|
| 1 | Bolt 원본 (schemaVersion 필드 없음) |
| 2 | 캐릭터에 `memories`/`breakthrough` 기본값, 업적 id `max_*` → `evo_*` |
| 3 | `constraintLevels` 추가. 없으면 전부 해제 |

새 변경은 `SAVE_SCHEMA_VERSION` + `MIGRATIONS[n]` 추가. 알 수 없는 미래 버전 세이브는 그대로 두고 기본값만 보충한다.

## 설정 (localStorage `survivors_proto_settings`, `src/game/core/settings.ts`)

`{ quality: "auto" | "high" | "low", volume: 0..1, muted: boolean }` — 세이브와 분리된 기기별 설정. 일시정지 메뉴·로비 설정에서 변경.
음소거이거나 볼륨 0이면 오디오 노드를 아예 만들지 않는다.

### 그래픽 품질

| 값 | 동작 |
|---|---|
| `auto` (기본) | 평균 프레임 간격 > 24ms 가 2초 이상 지속되면 이번 세션 동안 저사양으로 전환 (설정 패널에 "자동 → 저사양 적용 중" 표시, 100ms 넘는 간격·숨김 탭은 측정 제외) |
| `high` | 모든 장식 효과 |
| `low` | 장식 생략: 폭탄 잔불, 브레스 깜빡임, 병합 보석 광채·반짝임, 엘리트 은은한 채움, 흡수 반경 원, 처치 이펙트 |

모든 품질에서 공통: FPS 상한 60, 일시정지 중 재렌더 없음, shadowBlur 없음, 그라디언트 캐시.

## 원클릭 실행기

| 항목 | 내용 |
|---|---|
| 파일 | `release/SurvivorsProto.exe` (~380KB, `npm run build:exe`) |
| 실행 | 루프백 HTTP 서버(포트 37615 → 38917 → 41234 → 임의) + Edge/Chrome `--app` 창 (없으면 기본 브라우저) |
| 데이터 폴더 | `%LOCALAPPDATA%\SurvivorsProto\` — `browser-profile/`, `save.json`, `save.json.bak`, `launcher.port` |
| 종료 | 창 닫힘(bye) 후 6초, 또는 ping 150초 무응답 |
| 중복 실행 | 기존 서버로 창만 추가 |

### 세이브 동기화 (실행기 모드에서만)

1. 시작 시 `GET /__launcher/save` → 디스크와 브라우저 세이브 중 `updatedAt` 이 큰 쪽을 양쪽에 맞춤
2. `saveSave()` 마다 `PUT /__launcher/save` (2MB 이하 JSON, 원자적 교체 + `.bak`)

→ 포트가 바뀌어 브라우저 저장소(origin)가 달라져도, 브라우저 프로필을 지워도 진행도가 이어진다.

## 네트워크

게임은 외부 네트워크 요청을 하지 않는다 (배포·릴리스가 없는 토이 프로젝트라 업데이트 확인 기능은 두지 않음).
실행기 모드의 통신은 모두 `127.0.0.1` 로컬 실행기와만 한다.
