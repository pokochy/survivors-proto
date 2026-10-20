// ============================================================
//  WeaponManager.ts — Orchestrates all weapon instances
//  무기별 동작은 weapons/registry.ts 의 WEAPON_MODULES가 정의한다.
//  이 클래스는 보유 무기 목록과 각 무기의 런타임 상태만 관리한다.
// ============================================================

import { CONFIG } from "@/game/data/config";
import type {
  AccessoryType,
  EnemyState,
  PlayerState,
  WeaponInstance,
  WeaponMods,
  WeaponType,
} from "@/game/core/types";
import { EVOLUTIONS, SUPER_EVOLUTIONS, superEvolutionFor } from "@/game/data/evolutions";
import { ALL_WEAPON_TYPES, WEAPON_MODULES } from "@/game/weapons/registry";

export type { WeaponMods } from "@/game/core/types";

export function allWeaponTypes(): WeaponType[] {
  return [...ALL_WEAPON_TYPES];
}

export function weaponName(type: WeaponType): string {
  return CONFIG.weapons[type].name;
}

export function weaponEvolvedName(type: WeaponType): string {
  return EVOLUTIONS[type].evolvedName;
}

/** Name shown in the HUD and results, including super evolution. */
export function weaponFormName(w: Pick<WeaponInstance, "type" | "evolved" | "super">): string {
  if (w.super) {
    const s = SUPER_EVOLUTIONS.find((e) => e.weapon === w.type);
    if (s) return s.name;
  }
  return w.evolved ? EVOLUTIONS[w.type].evolvedName : CONFIG.weapons[w.type].name;
}

export function weaponDesc(type: WeaponType): string {
  return CONFIG.weapons[type].desc;
}

export function weaponMaxLevel(type: WeaponType): number {
  return CONFIG.weapons[type].maxLevel as number;
}

export class WeaponManager {
  weapons: WeaponInstance[] = [];
  /** 무기 종류별 런타임 상태 (형태는 각 WeaponModule이 정의) */
  private states = new Map<WeaponType, unknown>();
  /** renderOrder 기준으로 정렬된 보유 무기 (획득 시에만 재정렬) */
  private renderList: WeaponInstance[] = [];
  private mods: WeaponMods = { damageMult: 1, cooldownMult: 1 };

  constructor(startWeapon: WeaponType = "bullet") {
    this.addWeapon(startWeapon);
  }

  setMods(mods: WeaponMods): void {
    this.mods = mods;
  }

  reset(startWeapon: WeaponType = "bullet"): void {
    this.weapons = [];
    this.renderList = [];
    this.states.clear();
    for (const type of ALL_WEAPON_TYPES) WEAPON_MODULES[type].resetGlobals?.();
    this.addWeapon(startWeapon);
  }

  hasWeapon(type: WeaponType): boolean {
    return this.weapons.some((w) => w.type === type);
  }

  canAddWeapon(): boolean {
    return this.weapons.length < CONFIG.maxWeapons;
  }

  addWeapon(type: WeaponType): void {
    if (this.hasWeapon(type)) return;
    const w: WeaponInstance = { type, level: 1, cooldownTimer: 0, burstShotsLeft: 0, burstTimer: 0, evolved: false, super: false };
    this.weapons.push(w);
    this.states.set(type, WEAPON_MODULES[type].createState(w));
    this.renderList = [...this.weapons].sort(
      (a, b) => WEAPON_MODULES[a.type].renderOrder - WEAPON_MODULES[b.type].renderOrder,
    );
  }

  /**
   * Evolve a weapon into its final form.
   * The level stays at max: evolved stats are "max-level stats × evolution multipliers",
   * which is what the codex shows (original design, see wiki/overview/original-intent-audit.md).
   * Evolved weapons never level up again (levelUpWeapon/getUpgradeableWeapons skip them).
   */
  evolveWeapon(type: WeaponType, characterId?: string): void {
    const w = this.weapons.find((w) => w.type === type);
    if (!w || w.evolved) return;
    w.evolved = true;
    w.super = superEvolutionFor(characterId, type) !== null;
    w.level = weaponMaxLevel(type);
    w.cooldownTimer = 0;
    w.burstShotsLeft = 0;
    w.burstTimer = 0;
    const mod = WEAPON_MODULES[type];
    if (mod.onEvolve) this.states.set(type, mod.onEvolve(this.states.get(type), w));
  }

  isEvolved(type: WeaponType): boolean {
    const w = this.weapons.find((w) => w.type === type);
    return w ? w.evolved : false;
  }

  /** Get weapons that can evolve (Lv8 + paired accessory + not already evolved). */
  getEvolvableWeapons(hasAccessory: (type: AccessoryType) => boolean): WeaponInstance[] {
    return this.weapons.filter((w) => {
      if (w.evolved) return false;
      if (w.level < weaponMaxLevel(w.type)) return false;
      const evo = EVOLUTIONS[w.type];
      return hasAccessory(evo.pairedAccessory);
    });
  }

  levelUpWeapon(type: WeaponType): void {
    const w = this.weapons.find((w) => w.type === type);
    if (!w) return;
    // Evolved weapons are final form — no further leveling.
    if (w.evolved) return;
    const max = weaponMaxLevel(type);
    if (w.level >= max) return;
    w.level++;
    const mod = WEAPON_MODULES[type];
    if (mod.onLevelUp) this.states.set(type, mod.onLevelUp(this.states.get(type), w));
  }

  getWeaponLevel(type: WeaponType): number {
    const w = this.weapons.find((w) => w.type === type);
    return w ? w.level : 0;
  }

  getUpgradeableWeapons(): WeaponInstance[] {
    return this.weapons.filter((w) => {
      // Evolved weapons are final form — not upgradeable.
      if (w.evolved) return false;
      return w.level < weaponMaxLevel(w.type);
    });
  }

  getUnownedWeapons(): WeaponType[] {
    return ALL_WEAPON_TYPES.filter((t) => !this.hasWeapon(t));
  }

  update(
    enemies: EnemyState[],
    player: PlayerState,
    dt: number,
    onKill: () => void
  ): void {
    for (const w of this.weapons) {
      WEAPON_MODULES[w.type].update(this.states.get(w.type), {
        enemies,
        px: player.x,
        py: player.y,
        w,
        dt,
        onKill,
        mods: this.mods,
        aim: player.aim,
      });
    }
  }

  render(ctx: CanvasRenderingContext2D, player: PlayerState): void {
    for (const w of this.renderList) {
      WEAPON_MODULES[w.type].render(ctx, this.states.get(w.type), player, w);
    }
  }
}
