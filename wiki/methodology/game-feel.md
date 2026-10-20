# 게임 필 (Game Feel / Juice)

## 배경

Martin Jonasson & Petri Purho 의 발표 *Juice it or lose it* (GDC Europe 2012) — 평범한 벽돌깨기에
트윈·늘림/눌림·흔들림·소리·파티클을 얹자 같은 규칙이 훨씬 재미있어졌다.
([Game Developer 기사](https://www.gamedeveloper.com/design/video-is-your-game-juicy-enough-), [Kenney 추천 영상 목록](https://kenney.nl/learn/must-see-videos-for-indie-developers))

반론도 있다: 과한 주스는 설계의 약점을 가리고 모든 타격을 시각 소음으로 만든다.
([Wayline — The "Juice" Problem](https://www.wayline.io/blog/the-juice-problem-how-exaggerated-feedback-is-harming-game-design))
Folmer Kelly 의 *Don't Juice It or Lose It* (GDC Europe 2014) 도 몰입 손실을 지적했다.

타격감 연구 정리 글은 히트스톱·사운드 일관성·카메라 제어의 비중이 크고, 히트스톱은 0.05–0.1초가 적당하다고 소개한다.
([eastondev — Game feel](https://eastondev.com/blog/en/posts/dev/20260521-game-feedback-feel/))

## 이 게임의 기준 — "짧고, 또렷하게, 끌 수 있게"

원작자는 **잔상·모션블러·반투명**에 여러 번 불만을 표했다 ([의도 대조표](../overview/original-intent-audit.md)).
그래서:

| 요소 | 현재 | 원칙 |
|---|---|---|
| 효과음 | WebAudio 합성(히트는 한 번에 하나, 70ms, 피격, 경험치 음높이, 레벨업, 게임오버) | 볼륨·음소거 설정 존중, 음소거면 노드 생성 안 함. 겹치면 커지므로 히트음은 겹치지 않음 |
| 처치 이펙트 | Kenney 별 텍스처, 0.18초, 최대 32개 | 저사양에서 끔, 짧게 사라짐 |
| 피격 | 무적 시간 동안 플레이어 깜빡임 | 유지 |
| 넉백 | 폭풍의 칼날 | 데이터로 조정 (`MELEE_EVOLVED_KNOCKBACK`). 화염 오오라는 넉백 없음 |
| 화면 흔들림 | 없음 | 넣는다면 엘리트 처치·피격에만, 2–4px, 설정으로 끌 수 있게 |
| 히트스톱 | 없음 | 수백 마리가 맞는 장르라 개별 히트스톱은 부적합 — 엘리트 처치에만 0.05초 정도 고려 |
| 데미지 숫자 | 없음 | 넣는다면 개수 상한·병합 필수 (텍스트 렌더는 비싸다 — web.dev) |

## 체크

- 새 이펙트는 `render/effects.ts` 에, 개수 상한·수명·`isLowQuality()` 생략을 함께 구현한다.
- 엔티티(적·플레이어)는 항상 불투명. 이펙트가 엔티티를 덮지 않도록 그리는 순서를 지킨다(보석 → 적 → 이펙트 → 무기 → 플레이어).
