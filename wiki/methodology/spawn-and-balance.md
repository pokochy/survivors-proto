# 스폰 설계와 밸런스 검증

## 현재 스폰 (요약)

간격 0.8초에서 시작. 처음 1분은 초당 ×0.98, 그 뒤는 분당 ×0.75 (최소 간격 없음). 동시 상한은 120마리에서 분당 100%p씩 증가, 등장 시간이 지난 종류 중 가중치 무작위,
60초마다 엘리트. 상세: [specs/enemies-spawning.md](../specs/enemies-spawning.md)

특징: 간격은 스폰 횟수가 아니라 경과 시간으로 줄어든다. 물량은 새 적 종류와 상한(120 × (1 + 경과 분))에 의존하고, 일반 적 체력은 생성 시 1.5^(경과 분), 엘리트는 500 × 2^(경과 분)으로 오른다.

## 대안 1 — 분 단위 웨이브 표 (Vampire Survivors 방식)

VS 는 1분마다 웨이브를 정의한다: 최소 유지 수, 스폰 간격, 종류. 살아 있는 적이 300 이상이면 주기 스폰을 멈춘다.
([VS Wiki — Enemies](https://vampire-survivors.fandom.com/wiki/Enemies))

```ts
// 예시 (도입 시 config.ts 에 추가)
waves: [
  { from: 0,   min: 15, interval: 0.8, types: ["slime"] },
  { from: 60,  min: 30, interval: 0.6, types: ["slime", "bat", "skeleton"] },
  { from: 120, min: 50, interval: 0.5, types: ["bat", "ghost", "brute"], event: "ring" },
]
```
장점: 시간대별 체감을 **데이터로** 설계, 이벤트(포위 원진·대열) 삽입 용이, 밸런스 수정이 config 한 곳.
→ 게임 디자인 변경이므로 원작자 결정 후 도입 ([로드맵](../direction/README.md)).

## 대안 2 — 긴장도 기반 디렉터 (Left 4 Dead AI Director)

Valve 는 플레이어의 "긴장도"를 추정해 **고조 → 정점 → 휴식** 주기로 적 수를 조절했다.
(Michael Booth, *The AI Systems of Left 4 Dead*, 2009 — Valve 발표 자료)
우리에게 적용하면: 최근 받은 피해·HP·처치 속도로 긴장도를 계산해 웨이브 간격을 가감. 단순 웨이브 표 뒤에 얹을 수 있다.

## 밸런스 검증 방법

| 방법 | 도구 | 무엇을 본다 |
|---|---|---|
| 수치표 | `npm run docs:spec` | 레벨별 피해·쿨다운, 진화형이 Lv8보다 강한지 |
| 헤드리스 시뮬레이션 | `npm run sim` | 예외·NaN·상한 초과·레벨업 큐·소프트락 (회귀 검사) |
| DPS 비교 | 브라우저 콘솔에서 `WeaponManager` 를 직접 돌리는 스니펫 (아래) | 진화 전후, 무기 간 상대 화력 |
| 플레이테스트 | 개발 서버 | 체감 난이도, 5분/10분 시점 생존율 |

```js
// 개발 서버 콘솔: 걸어오는 더미 24마리 상대로 10초 DPS
const WM = await import('/src/game/systems/WeaponManager.ts');
// … (scripts/sim.mjs 의 패턴 참고)
```

### 커뮤니티 교훈
- 블록·라인 스폰을 넣자 예측 불가능성은 늘었지만 **총 스폰량이 의도치 않게 증가** → 그룹별 스폰율을 툴로 직접 조정. ([gamedev.net — Conquering Ciros 5주차](https://gamedev.net/blogs/entry/2277632-conquering-ciros-week-5-enemy-spawn-rate-tools))
- 적은 파괴 대신 **풀링**, 보스는 소수라 풀링 생략. ([gamedev.net — 8주차](https://gamedev.net/blogs/entry/2277732-conquering-ciros-week-8-vampire-survivor-ing-and-pooling-enemies))
- 성능 때문에 물량을 못 늘리면 **더 강한 적**으로 난이도를 올려라. ([itch.io](https://itch.io/post/12756916))

## 경험치 곡선

`xpToNext(L)` 은 L≤10 일 때 `floor(5 × 1.6^(L-1))`, 그 이후는 10레벨 필요량에 `1.4^(L-10)` 을 곱한다. 큰 병합 보석이 한 번에 여러 레벨을
올릴 수 있으며, 레벨마다 선택지가 하나씩 주어진다(KI-03).
