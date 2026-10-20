#!/usr/bin/env node
// ============================================================
//  scripts/gen-spec.mjs — 기능 명세 수치표 자동 생성
//
//    npm run docs:spec
//
//  게임 코드(src/game/**)를 Vite SSR로 직접 불러와 wiki/specs/generated/*.md 를 다시 쓴다.
//  밸런스(config.ts 등)를 바꾸면 이 명령으로 위키 수치표를 갱신할 것 — 손으로 고치지 않는다.
// ============================================================

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "wiki", "specs", "generated");

const server = await createServer({
  root,
  logLevel: "error",
  appType: "custom",
  server: { middlewareMode: true, hmr: false },
});

const load = (p) => server.ssrLoadModule(p);

try {
  const { CONFIG, xpForLevel } = await load("/src/game/data/config.ts");
  const { EVOLUTIONS, SUPER_EVOLUTIONS } = await load("/src/game/data/evolutions.ts");
  const P = await load("/src/game/data/progression.ts");
  const { AccessoryManager, allAccessoryTypes, accessoryName } = await load("/src/game/systems/AccessoryManager.ts");
  const { ALL_WEAPON_TYPES } = await load("/src/game/weapons/registry.ts");
  const B = await load("/src/game/weapons/BulletWeapon.ts");
  const M = await load("/src/game/weapons/MeleeWeapon.ts");
  const BO = await load("/src/game/weapons/BombWeapon.ts");
  const T = await load("/src/game/weapons/TrapWeapon.ts");
  const A = await load("/src/game/weapons/AuraWeapon.ts");
  const S = await load("/src/game/weapons/ShurikenWeapon.ts");
  const C = await load("/src/game/weapons/ClawWeapon.ts");
  const BR = await load("/src/game/weapons/BreathWeapon.ts");
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf-8"));

  // ---------------------------------------------------------------- helpers
  const n = (v, d = 1) => (Number.isInteger(v) ? String(v) : Number(v).toFixed(d).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, ""));
  const pct = (v) => `${Math.round(v * 100)}%`;
  const yes = (b) => (b ? "✔" : "—");
  const table = (head, rows) =>
    [`| ${head.join(" | ")} |`, `|${head.map(() => "---").join("|")}|`, ...rows.map((r) => `| ${r.join(" | ")} |`)].join("\n");
  const wi = (type, level, evolved = false) => ({ type, level, cooldownTimer: 0, burstShotsLeft: 0, burstTimer: 0, evolved });
  const levels = (type) => {
    const max = CONFIG.weapons[type].maxLevel;
    // evolved weapons keep their max level (final form)
    return [...Array.from({ length: max }, (_, i) => wi(type, i + 1)), wi(type, max, true)];
  };
  const lvLabel = (w) => (w.evolved ? `**진화**` : `${w.level}`);
  const header = (title) =>
    [
      `# ${title}`,
      "",
      `> ⚙ **자동 생성 문서** — \`npm run docs:spec\` 으로 다시 만든다. 직접 수정하지 말 것.`,
      `> 기준: v${pkg.version} · 출처: \`src/game/data/*.ts\`, \`src/game/weapons/*.ts\``,
      "",
    ].join("\n");

  // ---------------------------------------------------------------- weapons
  const weaponTables = {
    bullet: () =>
      table(
        ["Lv", "피해", "연사 수", "연사 간격(s)", "대기(s)", "탄속", "관통", "탄 반경", "도달 시 효과"],
        levels("bullet").map((w) => [
          lvLabel(w), n(B.bulletDamage(w)), B.bulletBurstCount(w), n(B.bulletBurstInterval(w), 2),
          n(B.bulletBurstPause(w), 2), n(B.bulletSpeed(w), 0), B.bulletPierce(w) >= 999 ? "∞" : B.bulletPierce(w),
          n(B.bulletProjectileRadius(w)), B.bulletLevelEffect(w) ?? "",
        ]),
      ),
    melee: () =>
      table(
        ["Lv", "피해", "칼날 수", "회전(rad/s)", "궤도 반경", "칼날 크기", "도달 시 효과"],
        levels("melee").map((w) => [
          lvLabel(w), n(M.meleeDamage(w)), M.meleeBladeCount(w), n(M.meleeAngularSpeed(w)),
          n(M.meleeBladeRadius(w)), n(M.meleeBladeSize(w)), M.meleeLevelEffect(w) ?? "",
        ]),
      ),
    bomb: () =>
      table(
        ["Lv", "피해", "쿨다운(s)", "폭발 반경", "동시 투하", "잔류 화염", "도달 시 효과"],
        levels("bomb").map((w) => [
          lvLabel(w), n(BO.bombDamage(w)), n(BO.bombCooldown(w), 2), n(BO.bombExplosionRadius(w)),
          BO.bombCount(w), yes(BO.bombHasBurn(w)), BO.bombLevelEffect(w) ?? "",
        ]),
      ),
    trap: () =>
      table(
        ["Lv", "피해", "쿨다운(s)", "지속(s)", "최대 수", "반경", "감속", "도달 시 효과"],
        levels("trap").map((w) => [
          lvLabel(w), n(T.trapDamage(w)), n(T.trapCooldown(w), 2), T.trapLifetime(w) >= 999 ? "영구" : n(T.trapLifetime(w)), T.trapMaxCount(w),
          n(T.trapRadius(w)), T.trapHasSlow(w) ? `-${pct(1 - T.trapSlowFactor(w))}` : "—", T.trapLevelEffect(w) ?? "",
        ]),
      ),
    aura: () =>
      table(
        ["Lv", "틱 피해", "틱 간격(s)", "반경", "화상 피해", "도달 시 효과"],
        levels("aura").map((w) => {
          const s = A.createAuraState(w);
          const dmg = s.damage * (A.auraDoubleDamage(w) ? 2 : 1);
          return [
            lvLabel(w), n(dmg), n(s.tickInterval, 3), n(s.radius), s.burnDamage > 0 ? n(s.burnDamage) : "—",
            A.auraLevelEffect(w) ?? "",
          ];
        }),
      ),
    shuriken: () =>
      table(
        ["Lv", "피해", "쿨다운(s)", "개수", "탄속", "관통", "크기", "도달 시 효과"],
        levels("shuriken").map((w) => [
          lvLabel(w), n(S.shurikenDamage(w)), n(S.shurikenCooldown(w), 2), S.shurikenCount(w), n(S.shurikenSpeed(w), 0),
          S.shurikenPierce(w) >= 999 ? "∞" : S.shurikenPierce(w), n(S.shurikenRadius(w)), S.shurikenLevelEffect(w) ?? "",
        ]),
      ),
    claw: () =>
      table(
        ["Lv", "피해", "쿨다운(s)", "반경/사거리", "연속 베기", "도달 시 효과"],
        levels("claw").map((w) => {
          if (w.evolved) {
            const b = BR.createBreathState(w);
            return [lvLabel(w), `${n(b.damage)} /틱(${b.tickInterval}s)`, n(b.cooldown, 2), `사거리 ${n(b.range)}`, "브레스 0.8s · 60°", "이동 방향 입자 + 화상"];
          }
          const c = C.createClawState(w);
          return [lvLabel(w), n(c.damage), n(c.cooldown, 2), n(c.radius), C.clawSlashCount(w), C.clawLevelEffect(w) ?? ""];
        }),
      ),
  };

  const weaponDoc = [
    header("무기 수치표 (Weapons)"),
    "공통: 실제 피해 = 표의 피해 × 캐릭터/특성/장신구/패시브 배율 (`GameEngine.updateWeaponMods`). 쿨다운도 동일하게 배율 적용.",
    "진화 행은 진화 무기 수치다 — 최대 레벨 수치에 진화 배율을 곱한 최종형이며 더 이상 레벨업하지 않는다.",
    "",
    "## 진화 조건 요약",
    "",
    table(
      ["무기", "최대 레벨", "필요 장신구", "진화 무기", "설명"],
      ALL_WEAPON_TYPES.map((t) => [
        `${CONFIG.weapons[t].name} (\`${t}\`)`, CONFIG.weapons[t].maxLevel,
        `${accessoryName(EVOLUTIONS[t].pairedAccessory)} (\`${EVOLUTIONS[t].pairedAccessory}\`)`,
        EVOLUTIONS[t].evolvedName, EVOLUTIONS[t].desc,
      ]),
    ),
    "",
    "## 초진화",
    "",
    "스페셜 캐릭터가 자신의 시작 무기를 진화시키면 일반 진화 대신 이 형태가 된다. 다른 캐릭터의 같은 무기는 위 진화 그대로다.",
    "",
    table(
      ["캐릭터", "무기", "초진화", "설명"],
      SUPER_EVOLUTIONS.map((s) => {
        const who = P.CHARACTERS.find((c) => c.id === s.characterId);
        return [who ? who.name : s.characterId, CONFIG.weapons[s.weapon].name, s.name, s.desc];
      }),
    ),
    "",
    ...ALL_WEAPON_TYPES.flatMap((t) => [
      `## ${CONFIG.weapons[t].name} — \`${t}\``,
      "",
      `> ${CONFIG.weapons[t].desc} · 색 \`${CONFIG.weapons[t].color}\``,
      "",
      weaponTables[t] ? weaponTables[t]() : "_(표 생성기 미등록 — scripts/gen-spec.mjs 에 추가)_",
      "",
    ]),
  ].join("\n");

  // ---------------------------------------------------------------- accessories
  const am = new AccessoryManager();
  const accDoc = [
    header("장신구 수치표 (Accessories)"),
    `보유 한도: **${CONFIG.maxAccessories}개** · 레벨업 선택지에서 획득/강화`,
    "",
    table(
      ["장신구", "id", "설명", ...Array.from({ length: 5 }, (_, i) => `Lv${i + 1}`), "진화 짝 무기"],
      allAccessoryTypes().map((t) => {
        const def = CONFIG.accessories[t];
        const effects = Array.from({ length: def.maxLevel }, (_, i) => {
          const s = am.getEffectPreview(t, i);
          return i === 0 ? s : s.split(" → ")[1];
        });
        const pair = ALL_WEAPON_TYPES.filter((w) => EVOLUTIONS[w].pairedAccessory === t).map((w) => CONFIG.weapons[w].name);
        return [def.name, `\`${t}\``, def.desc, ...effects, pair.join(", ") || "—"];
      }),
    ),
    "",
    "- 피해 감소는 합산 후 최대 70%로 제한 (`AccessoryManager.computeMods`).",
    "",
  ].join("\n");

  // ---------------------------------------------------------------- enemies
  const e = CONFIG.enemy;
  const el = CONFIG.elite;
  const enemyDoc = [
    header("적·스폰 수치표 (Enemies & Spawning)"),
    "## 적 종류",
    "",
    table(
      ["이름", "id", "등장(초)", "HP", "속도", "접촉 피해", "반경", "가중치", "모양"],
      CONFIG.enemyTypes.map((t) => [t.name, `\`${t.id}\``, t.unlockedTime, t.hp, t.speed, t.damage, t.radius, t.spawnWeight, t.shape]),
    ),
    "",
    "- 일반 적 속도는 생성 시 ×0.8~1.2 무작위.",
    "- 플레이어와 150px 이상 떨어지면 거리 비례 가속 (500px에서 최대 ×2.6) — 화면 밖 적이 따라잡도록.",
    `- 플레이어에서 ${n(CONFIG.canvasWidth * 1.5)}px 이상 멀어진 적은 제거 (cullFarEnemies).`,
    "",
    "## 스폰",
    "",
    table(
      ["항목", "값"],
      [
        ["첫 스폰 간격", `${e.spawnInterval}s`],
        ["처음 1분", `초당 ×${e.spawnDecayPerSecond}`],
        ["1분 이후", `분당 ×${e.spawnDecayPerMinute}. 최소 간격 없음`],
        ["최대 동시 적 수", `${e.maxCount} × (1 + ${e.maxCountGrowthPerMinute} × 경과 분). 0분 ${e.maxCount}, 1분 ${e.maxCount * 2}, 2분 ${e.maxCount * 3}`],
        ["접촉 피해 쿨다운(적별)", `${e.contactDamageCooldown}s`],
        ["엘리트 주기", `${el.spawnInterval}s마다 1마리 (상한과 무관). ${el.killSeconds}초 안에 처치하지 못하면 게임오버`],
        ["엘리트 체력", `${el.hp} × ${el.hpPerMinute}^(경과 분). 종류와 무관. 0분 ${el.hp}, 1분 ${el.hp * el.hpPerMinute}, 2분 ${el.hp * el.hpPerMinute ** 2}`],
        ["엘리트 배율", `피해 ×${el.damageMult} · 속도 ×${el.speedMult} · 크기 ×${el.radiusMult}`],
        ["생성 시 체력", `일반 적: 기본 HP × ${e.hpPerMinute}^(경과 분). 이미 나온 적은 변하지 않음`],
        ["엘리트 보상", "보물 상자 → 획득 시 즉시 레벨업 선택지"],
      ],
    ),
    "",
  ].join("\n");

  // ---------------------------------------------------------------- leveling
  let cum = 0;
  const lvRows = [];
  for (let lv = 1; lv <= 30; lv++) {
    const need = xpForLevel(lv);
    cum += need;
    lvRows.push([lv, need, cum]);
  }
  const levelDoc = [
    header("레벨·경험치 (Leveling)"),
    `공식: L≤${CONFIG.leveling.xpGrowthLateFrom - 1} 은 \`floor(${CONFIG.leveling.baseXpToNext} × ${CONFIG.leveling.xpGrowth}^(L-1))\`, 그 이후는 \`floor(${CONFIG.leveling.baseXpToNext} × ${CONFIG.leveling.xpGrowth}^${CONFIG.leveling.xpGrowthLateFrom - 2} × ${CONFIG.leveling.xpGrowthLate}^(L-${CONFIG.leveling.xpGrowthLateFrom - 1}))\` · 일반 보석 1개 = 1 XP (병합 보석은 합산)`,
    "",
    table(["레벨 L", "L→L+1 필요 XP", "누적 XP"], lvRows),
    "",
    "## 플레이어 기본값",
    "",
    table(
      ["항목", "값"],
      [
        ["최대 HP", CONFIG.player.maxHp],
        ["이동 속도", `${CONFIG.player.speed}px/s`],
        ["피격 무적", `${CONFIG.player.invulnTime}s`],
        ["보석 흡수 반경", `${CONFIG.player.pickupRadius}px`],
        ["보석 끌림 속도", `${CONFIG.gem.magnetSpeed}px/s`],
        ["무기 슬롯 / 장신구 슬롯", `${CONFIG.maxWeapons} / ${CONFIG.maxAccessories}`],
        ["스코어", "처치 × 10 + 생존초 × 5"],
        ["획득 골드", "floor(스코어 / 10)"],
      ],
    ),
    "",
  ].join("\n");

  // ---------------------------------------------------------------- characters & meta
  const metaDoc = [
    header("캐릭터·특성·업적·비용 (Meta progression)"),
    "## 캐릭터",
    "",
    table(
      ["이름", "id", "HP", "속도", "피해", "쿨다운", "시작 무기", "패시브", "획득"],
      P.CHARACTERS.map((c) => [
        c.name, `\`${c.id}\``, `×${c.hpMult}`, `×${c.speedMult}`, `×${c.damageMult}`, `×${c.cooldownMult}`,
        CONFIG.weapons[c.startWeapon].name, c.passiveDesc,
        c.special ? `업적 \`${c.unlockAchievement}\` 후 뽑기` : c.id === "survivor" ? "기본 보유" : "뽑기",
      ]),
    ),
    "",
    "## 특성 (모든 캐릭터 공통 영구 강화)",
    "",
    table(
      ["특성", "id", "최대", "최대 효과", "Lv1 비용", "최대까지 총 비용"],
      P.TRAITS.map((t) => [t.name, `\`${t.id}\``, t.maxLevel, t.effectLabel(t.maxLevel), `${P.TRAIT_UPGRADE_COST(0)}G`, `${P.traitTotalSpent(t.maxLevel)}G`]),
    ),
    "",
    "## 업적",
    "",
    table(["업적", "id", "조건", "보상(별)"], P.ACHIEVEMENTS.map((a) => [a.name, `\`${a.id}\``, a.desc, a.reward])),
    "",
    "## 비용·성장",
    "",
    table(
      ["항목", "값"],
      [
        ["시작 골드", `${P.DEFAULT_GOLD}G`],
        ["뽑기 1회", `${P.GACHA_COST}G (10연 = ${P.GACHA_COST * 10}G)`],
        ["캐릭터 레벨업 (L→L+1)", `100 × L G (최대 Lv10, 레벨당 피해 +3%)`],
        ["각성(별) 1단계", `별 ${P.STAR_UP_STAR_COST}개 (최대 5성, 별당 HP·속도·피해 +5%)`],
        ["돌파 필요 기억", P.BREAKTHROUGH_MEMORY_COSTS.map((c, i) => `${i}→${i + 1}: ${c}`).join(" · ")],
        ["중복 뽑기 보상", `기억 +${P.DUPE_MEMORY_REWARD}`],
        ["돌파 효과", "1: HP+10%·피해+5%·속도+5% / 2: XP·흡수 +30% / 3: 패시브 강화 / 4: 진화 짝 장신구를 들고 시작"],
      ],
    ),
    "",
  ].join("\n");

  // ---------------------------------------------------------------- write
  fs.mkdirSync(outDir, { recursive: true });
  const files = {
    "weapons.md": weaponDoc,
    "accessories.md": accDoc,
    "enemies.md": enemyDoc,
    "leveling.md": levelDoc,
    "meta.md": metaDoc,
  };
  for (const [name, body] of Object.entries(files)) {
    fs.writeFileSync(path.join(outDir, name), body.trimEnd() + "\n", "utf-8");
    console.log(`[docs:spec] wrote wiki/specs/generated/${name}`);
  }
} finally {
  await server.close();
}
