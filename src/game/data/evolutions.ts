// ============================================================
//  evolutions.ts — Weapon evolution definitions
//  A weapon evolves when it reaches Lv8 AND the paired accessory is owned.
//  Evolution replaces the weapon with a stronger form at Lv1 (evolved),
//  with enhanced stats and new behaviors.
// ============================================================

import type { WeaponType } from "@/game/core/types";
import type { AccessoryType } from "@/game/core/types";

export interface EvolutionDef {
  weapon: WeaponType;
  pairedAccessory: AccessoryType;
  evolvedName: string;
  desc: string;
  // Stat multipliers applied on top of base after evolution
  damageMult: number;
  cooldownMult: number; // < 1 = faster
  // Extra behavior flag, checked by weapon code
  effect: string;
}

export const EVOLUTIONS: Record<WeaponType, EvolutionDef> = {
  bullet: {
    weapon: "bullet",
    pairedAccessory: "powerAmulet",
    evolvedName: "플라즈마 라이플",
    desc: "탄환 8연사 · 관통 무한 · 탄환 크기 2배",
    damageMult: 1.4,
    cooldownMult: 0.8,
    effect: "pierce_inf",
  },
  melee: {
    weapon: "melee",
    pairedAccessory: "swiftBoots",
    evolvedName: "폭풍의 칼날",
    desc: "칼날 8개 · 회전 속도 2배 · 넉백 추가",
    damageMult: 1.5,
    cooldownMult: 1.0,
    effect: "more_blades",
  },
  bomb: {
    weapon: "bomb",
    pairedAccessory: "hastePendant",
    evolvedName: "운석 폭격",
    desc: "폭탄 6개 동시 투하 · 폭발 범위 1.5배",
    damageMult: 1.6,
    cooldownMult: 0.7,
    effect: "more_bombs",
  },
  trap: {
    weapon: "trap",
    pairedAccessory: "vitalRing",
    evolvedName: "영혼의 토템",
    desc: "트랩 8개 · 감속 80% · 트랩 영구 지속",
    damageMult: 1.5,
    cooldownMult: 0.6,
    effect: "permanent",
  },
  aura: {
    weapon: "aura",
    pairedAccessory: "magnetCharm",
    evolvedName: "심판의 화염",
    desc: "오오라 범위 1.5배 · 화염 데미지 2배",
    damageMult: 2.0,
    cooldownMult: 0.5,
    effect: "huge_aura",
  },
  shuriken: {
    weapon: "shuriken",
    pairedAccessory: "xpcrystal",
    evolvedName: "환영 비도",
    desc: "비도 8개 · 부메랑 회귀 · 관통 무한",
    damageMult: 1.5,
    cooldownMult: 0.7,
    effect: "boomerang",
  },
  claw: {
    weapon: "claw",
    pairedAccessory: "natureBlessing",
    evolvedName: "브레스",
    desc: "이동 방향으로 60° 화염 입자 · 맞은 적 화상",
    damageMult: 1.6,
    cooldownMult: 0.6,
    effect: "breath",
  },
};

/**
 * Super evolution: a special character evolving their own starting weapon
 * replaces the normal evolution with a stronger form.
 */
export interface SuperEvolutionDef {
  characterId: string;
  weapon: WeaponType;
  name: string;
  desc: string;
}

export const SUPER_EVOLUTIONS: SuperEvolutionDef[] = [
  {
    characterId: "linya",
    weapon: "shuriken",
    name: "비도 난무",
    desc: "비도 20개 · 전방위 투척 · 부메랑 회귀 · 관통 무한",
  },
  {
    characterId: "euroan",
    weapon: "claw",
    name: "레인보우 브레스",
    desc: "길이·각도 1.5배 · 끊기지 않는 무지개 숨결 · 화상",
  },
];

export function superEvolutionFor(
  characterId: string | undefined,
  weapon: WeaponType,
): SuperEvolutionDef | null {
  if (!characterId) return null;
  return SUPER_EVOLUTIONS.find((s) => s.characterId === characterId && s.weapon === weapon) ?? null;
}

/** Check if a weapon meets evolution conditions. */
export function canEvolve(
  weaponType: WeaponType,
  weaponLevel: number,
  hasAccessory: (type: AccessoryType) => boolean,
  alreadyEvolved: boolean
): boolean {
  if (alreadyEvolved) return false;
  if (weaponLevel < 8) return false;
  const evo = EVOLUTIONS[weaponType];
  return hasAccessory(evo.pairedAccessory);
}
