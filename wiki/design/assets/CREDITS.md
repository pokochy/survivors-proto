# 에셋 출처와 라이선스 (Credits)

게임과 위키에 들어간 외부 에셋의 출처. 새 에셋을 추가하면 여기와 `src/assets/icons/credits.json` 을 함께 갱신한다.

## 게임에 포함된 에셋

| 에셋 | 위치 | 작가 / 출처 | 라이선스 |
|---|---|---|---|
| 아이콘 74종 | `src/assets/icons/*.svg` | game-icons.net — DarkZaitzev, Delapouite, Lorc, Sbed, Skoll, Willdabeast | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) — **출처 표기 필수** (로비 하단에 표기) |
| 이펙트 텍스처 7종 (처치 별·레벨업 빛·총구 화염·폭발 불꽃·잔불 등) | `src/assets/fx/*.png` | Kenney — Particle Pack (128px 축소) | [CC0](http://creativecommons.org/publicdomain/zero/1.0/) |
| 픽셀 아트 (리냐·에우로안 제외: 캐릭터·적 걷기 시트, 초상, 월드 타일, 투사체·이펙트·아이템) | `src/assets/pixel/` (원본 팩 전체: `art/ninja-adventure/`) | [Ninja Adventure Asset Pack](https://pixel-boy.itch.io/ninja-adventure-asset-pack) — Pixel-boy & AAA (GitHub 미러 `Untersander/Gladiator` 에서 받음) | [CC0](http://creativecommons.org/publicdomain/zero/1.0/) — `art/ninja-adventure/LICENSE.txt` |
| 리냐 걷기 시트·초상 (고양이 수인) | `art/linya/` → `src/assets/pixel/units/char-linya.png`, `faces/char-linya.png` | Universal LPC 레이어 합성. 몸·눈: Redshrike, bluecarrot16, ElizaWy 외 LPC 기여자. 귀·꼬리·기모노·부츠: JaidynReiman. 머리: bluecarrot16, ElizaWy. 출처는 `art/linya/README.md` | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) — 몸과 눈이 동일조건변경허락이라 합성본도 동일 |
| 에우로안 걷기 시트·초상 (빨간 머리 남성) | `art/euroan/` → `src/assets/pixel/units/char-euroan.png`, `faces/char-euroan.png` | Universal LPC 레이어 합성. 몸·머리: bluecarrot16, Redshrike 외. 머리색: JaidynReiman, MrBeast (bedhead). 트렌치: bluecarrot16. 부츠: JaidynReiman, Nila122. 출처는 `art/euroan/README.md` | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) — 몸·머리·코트가 동일조건변경허락이라 합성본도 동일 |
| 16×16 던전 타일셋 II (게임 미사용, 라이브러리) | `art/0x72-dungeon-ii/` | [0x72 — DungeonTileset II](https://0x72.itch.io/dungeontileset-ii) (GitHub 미러 `veroteknic/godot2d`) | CC0 (작가 페이지 표기) |
| 늑대 스프라이트 | `public/assets/enemy/Wolf.png` | 원본 프로젝트 포함 — **출처 미확인** | 미확인 (KI-06) |
| 발톱 이미지 | `public/assets/weapon/claw.PNG` | 원본 프로젝트 포함 — **출처 미확인** | 미확인 (KI-06) |
| 파비콘·실행기 아이콘 | `public/favicon.svg`, `launcher/app.ico` | 이 저장소에서 제작 | 프로젝트와 동일 |

아이콘 가공: 원본의 검은 배경 사각형을 제거하고 `fill="currentColor"` 로 바꿨다(CC BY 허용 범위의 변형). 스크립트·외부 참조가 없는지 검사했다.

## 위키 후보 에셋 (게임에는 아직 미포함)

| 에셋 | 위치 | 출처 | 라이선스 |
|---|---|---|---|
| 파티클 14종 (128px 축소) | `wiki/design/assets/particles/` | [Kenney — Particle Pack](https://kenney.nl/assets/particle-pack) | CC0 |
| 16×16 던전 타일셋 | `wiki/design/assets/tiny-dungeon/` | [Kenney — Tiny Dungeon](https://kenney.nl/assets/tiny-dungeon) | CC0 |
| 샘플 이미지 3종 | `wiki/design/assets/references/` | Kenney — Tiny Dungeon / 1-Bit Pack / Particle Pack 미리보기 | CC0 |

Kenney 라이선스 원문: `wiki/design/assets/particles/Kenney-License.txt`, `src/assets/fx/Kenney-License.txt` (표기 의무는 없지만 남겨 둔다).

## 아이콘별 작가

### DarkZaitzev

[`char-scout`](https://game-icons.net/1x1/darkzaitzev/running-ninja.html), [`char-survivor`](https://game-icons.net/1x1/darkzaitzev/hooded-figure.html)

### Delapouite

[`acc-swiftBoots`](https://game-icons.net/1x1/delapouite/running-shoe.html), [`acc-vitalRing`](https://game-icons.net/1x1/delapouite/power-ring.html), [`char-berserker`](https://game-icons.net/1x1/delapouite/barbarian.html), [`char-euroan`](https://game-icons.net/1x1/delapouite/bear-head.html), [`char-guardian`](https://game-icons.net/1x1/delapouite/templar-shield.html), [`decor-grass`](https://game-icons.net/1x1/delapouite/grass.html), [`decor-stones`](https://game-icons.net/1x1/delapouite/stone-pile.html), [`enemy-bat`](https://game-icons.net/1x1/delapouite/bat.html), [`enemy-brute`](https://game-icons.net/1x1/delapouite/ogre.html), [`enemy-slime`](https://game-icons.net/1x1/delapouite/slime.html), [`menu-gacha`](https://game-icons.net/1x1/delapouite/present.html), [`stat-gold`](https://game-icons.net/1x1/delapouite/two-coins.html), [`stat-score`](https://game-icons.net/1x1/delapouite/stars-stack.html), [`trait-power`](https://game-icons.net/1x1/delapouite/swords-power.html), [`ui-reroll`](https://game-icons.net/1x1/delapouite/perspective-dice-six-faces-random.html), [`ui-sound`](https://game-icons.net/1x1/delapouite/speaker.html), [`ui-upgrade`](https://game-icons.net/1x1/delapouite/upgrade.html), [`weapon-trap-evo`](https://game-icons.net/1x1/delapouite/totem.html)

### Lorc

[`acc-hastePendant`](https://game-icons.net/1x1/lorc/stopwatch.html), [`acc-magnetCharm`](https://game-icons.net/1x1/lorc/magnet.html), [`acc-natureBlessing`](https://game-icons.net/1x1/lorc/sprout.html), [`acc-powerAmulet`](https://game-icons.net/1x1/lorc/gem-pendant.html), [`acc-shieldForge`](https://game-icons.net/1x1/lorc/checked-shield.html), [`acc-thornArmor`](https://game-icons.net/1x1/lorc/spiked-armor.html), [`acc-xpcrystal`](https://game-icons.net/1x1/lorc/crystal-growth.html), [`char-linya`](https://game-icons.net/1x1/lorc/cat.html), [`char-mage`](https://game-icons.net/1x1/lorc/pointy-hat.html), [`decor-bones`](https://game-icons.net/1x1/lorc/crossed-bones.html), [`decor-cobweb`](https://game-icons.net/1x1/lorc/cobweb.html), [`decor-daisy`](https://game-icons.net/1x1/lorc/daisy.html), [`decor-deadwood`](https://game-icons.net/1x1/lorc/dead-wood.html), [`decor-mushroom`](https://game-icons.net/1x1/lorc/mushroom.html), [`decor-rock`](https://game-icons.net/1x1/lorc/rock.html), [`decor-skull`](https://game-icons.net/1x1/lorc/skull-crossed-bones.html), [`decor-tombstone`](https://game-icons.net/1x1/lorc/tombstone.html), [`enemy-elite`](https://game-icons.net/1x1/lorc/crowned-skull.html), [`enemy-ghost`](https://game-icons.net/1x1/lorc/ghost.html), [`enemy-wolf`](https://game-icons.net/1x1/lorc/wolf-head.html), [`enemy-wraith`](https://game-icons.net/1x1/lorc/spectre.html), [`menu-achievements`](https://game-icons.net/1x1/lorc/trophy.html), [`menu-characters`](https://game-icons.net/1x1/lorc/hood.html), [`menu-codex`](https://game-icons.net/1x1/lorc/open-book.html), [`menu-play`](https://game-icons.net/1x1/lorc/crossed-swords.html), [`menu-traits`](https://game-icons.net/1x1/lorc/star-swirl.html), [`proj-blade`](https://game-icons.net/1x1/lorc/broadsword.html), [`proj-dagger`](https://game-icons.net/1x1/lorc/plain-dagger.html), [`stat-time`](https://game-icons.net/1x1/lorc/hourglass.html), [`trait-rapidfire`](https://game-icons.net/1x1/lorc/lightning-helix.html), [`trait-swiftness`](https://game-icons.net/1x1/lorc/sprint.html), [`trait-vitality`](https://game-icons.net/1x1/lorc/heart-tower.html), [`ui-breakthrough`](https://game-icons.net/1x1/lorc/laurel-crown.html), [`ui-crown`](https://game-icons.net/1x1/lorc/crown.html), [`ui-memory`](https://game-icons.net/1x1/lorc/crystal-cluster.html), [`ui-star`](https://game-icons.net/1x1/lorc/beveled-star.html), [`ui-xp-gem`](https://game-icons.net/1x1/lorc/gems.html), [`weapon-aura`](https://game-icons.net/1x1/lorc/fire-ring.html), [`weapon-aura-evo`](https://game-icons.net/1x1/lorc/aura.html), [`weapon-bomb`](https://game-icons.net/1x1/lorc/fire-bomb.html), [`weapon-bomb-evo`](https://game-icons.net/1x1/lorc/meteor-impact.html), [`weapon-bullet-evo`](https://game-icons.net/1x1/lorc/plasma-bolt.html), [`weapon-claw`](https://game-icons.net/1x1/lorc/claw-slashes.html), [`weapon-claw-evo`](https://game-icons.net/1x1/lorc/dragon-breath.html), [`weapon-melee`](https://game-icons.net/1x1/lorc/spinning-sword.html), [`weapon-melee-evo`](https://game-icons.net/1x1/lorc/whirlwind.html), [`weapon-shuriken`](https://game-icons.net/1x1/lorc/thrown-daggers.html), [`weapon-shuriken-evo`](https://game-icons.net/1x1/lorc/shuriken.html), [`weapon-trap`](https://game-icons.net/1x1/lorc/wolf-trap.html)

### Sbed

[`stat-kills`](https://game-icons.net/1x1/sbed/death-skull.html), [`weapon-bullet`](https://game-icons.net/1x1/sbed/rifle.html)

### Skoll

[`enemy-skeleton`](https://game-icons.net/1x1/skoll/skeleton.html), [`ui-treasure`](https://game-icons.net/1x1/skoll/open-treasure-chest.html)

### Willdabeast

[`trait-greed`](https://game-icons.net/1x1/willdabeast/gold-bar.html)
