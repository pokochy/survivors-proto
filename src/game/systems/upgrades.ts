// ============================================================
//  upgrades.ts — 레벨업 선택지 생성 (GameEngine에서 분리)
//
//  규칙(원본 동작 그대로):
//   1) 진화 가능한 무기는 항상 선택지 맨 앞에 노출
//   2) 나머지 칸은 [무기 강화 / 신규 무기 / 장신구(강화+신규)] 3개 카테고리를
//      동일 가중치로 뽑은 뒤, 카테고리 안에서 무작위 1개 (중복 없음)
//   3) 총 3개
// ============================================================

import type { UpgradeOption } from "@/game/core/types";
import { EVOLUTIONS, superEvolutionFor } from "@/game/data/evolutions";
import { weaponLevelEffectAt } from "@/game/weapons/registry";
import { WeaponManager, weaponName, weaponFormName } from "@/game/systems/WeaponManager";
import { AccessoryManager, accessoryName } from "@/game/systems/AccessoryManager";

/** 레벨업 1회에 보여줄 선택지 수 */
const OPTION_COUNT = 3;

/** 카테고리별 가중치 — 0으로 두면 해당 카테고리는 나오지 않는다 */
const CATEGORY_WEIGHTS = {
  weaponLevel: 1, // 무기 강화
  newWeapon: 1, // 신무기 획득
  accessory: 1, // 장신구 (강화 + 신규)
} as const;

type Category = keyof typeof CATEGORY_WEIGHTS;

function optionKey(o: UpgradeOption): string {
  return o.kind + (o.weaponType ?? o.accessoryType ?? "");
}

export function pickUpgrades(wm: WeaponManager, am: AccessoryManager, characterId?: string): UpgradeOption[] {
  const pool: UpgradeOption[] = [];

  // Weapon level-up options (owned, not maxed) — 다음 레벨에서 얻는 효과를 표시
  for (const w of wm.getUpgradeableWeapons()) {
    const effect = weaponLevelEffectAt(w, w.level + 1);
    const displayName = weaponFormName(w);
    pool.push({
      kind: "weaponLevel",
      label: `${displayName} 강화 (Lv ${w.level + 1})`,
      weaponType: w.type,
      weaponName: displayName,
      effectDesc: effect ?? undefined,
    });
  }

  // New weapon options (if slots available)
  if (wm.canAddWeapon()) {
    for (const type of wm.getUnownedWeapons()) {
      pool.push({
        kind: "newWeapon",
        label: `${weaponName(type)} 획득`,
        weaponType: type,
        weaponName: weaponName(type),
      });
    }
  }

  // Weapon evolution options (max level + paired accessory owned)
  const evolvable = wm.getEvolvableWeapons((accType) => am.hasAccessory(accType));
  for (const w of evolvable) {
    const evo = EVOLUTIONS[w.type];
    const sup = superEvolutionFor(characterId, w.type);
    pool.push({
      kind: "weaponEvolve",
      label: sup
        ? `${weaponName(w.type)} 초진화 → ${sup.name}`
        : `${weaponName(w.type)} 진화 → ${evo.evolvedName}`,
      weaponType: w.type,
      weaponName: sup ? sup.name : evo.evolvedName,
      effectDesc: sup ? sup.desc : evo.desc,
    });
  }

  // Accessory level-up options (owned, not maxed)
  for (const a of am.getUpgradeableAccessories()) {
    pool.push({
      kind: "accessoryLevel",
      label: `${accessoryName(a.type)} 강화 (Lv ${a.level + 1})`,
      accessoryType: a.type,
      accessoryName: accessoryName(a.type),
      effectDesc: am.getEffectPreview(a.type, a.level),
    });
  }

  // New accessory options (if slots available)
  if (am.canAddAccessory()) {
    for (const type of am.getUnownedAccessories()) {
      pool.push({
        kind: "newAccessory",
        label: `${accessoryName(type)} 획득`,
        accessoryType: type,
        accessoryName: accessoryName(type),
        effectDesc: am.getEffectPreview(type, 0),
      });
    }
  }

  // Evolution options always appear first
  const evolutionOpts = pool.filter((o) => o.kind === "weaponEvolve");
  const pickCount = Math.max(0, OPTION_COUNT - evolutionOpts.length);

  const categories: Record<Category, UpgradeOption[]> = {
    weaponLevel: [],
    newWeapon: [],
    accessory: [],
  };
  for (const o of pool) {
    if (o.kind === "weaponEvolve") continue;
    if (o.kind === "weaponLevel") categories.weaponLevel.push(o);
    else if (o.kind === "newWeapon") categories.newWeapon.push(o);
    else categories.accessory.push(o); // accessoryLevel + newAccessory
  }

  const picked: UpgradeOption[] = [];
  const usedKeys = new Set<string>();
  const catKeys = Object.keys(categories) as Category[];
  for (let slot = 0; slot < pickCount; slot++) {
    // Build available categories (non-empty, not exhausted)
    const avail = catKeys.filter(
      (k) => CATEGORY_WEIGHTS[k] > 0 && categories[k].some((o) => !usedKeys.has(optionKey(o))),
    );
    if (avail.length === 0) break;

    // Weighted category pick
    const totalW = avail.reduce((s, k) => s + CATEGORY_WEIGHTS[k], 0);
    let roll = Math.random() * totalW;
    let chosen = avail[0];
    for (const k of avail) {
      roll -= CATEGORY_WEIGHTS[k];
      if (roll <= 0) { chosen = k; break; }
    }

    // Pick a random unused option within the chosen category
    const opts = categories[chosen].filter((o) => !usedKeys.has(optionKey(o)));
    if (opts.length === 0) continue;
    const opt = opts[Math.floor(Math.random() * opts.length)];
    usedKeys.add(optionKey(opt));
    picked.push(opt);
  }

  return [...evolutionOpts, ...picked];
}
