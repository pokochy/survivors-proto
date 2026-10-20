// ============================================================
//  weapons/registry.ts — 무기 등록부 (Weapon Registry)
//
//  모든 무기는 여기 한 곳에 등록된다. WeaponManager / 업그레이드 / 도감은
//  무기 종류별 switch 문 없이 이 표만 보고 동작한다.
//
//  새 무기 추가 순서는 AGENTS.md "새 무기 추가 체크리스트" 참고.
//  (types.ts의 WeaponType 유니온에 추가 → config.ts 스탯 → evolutions.ts →
//   무기 파일 작성 → 아래 WEAPON_MODULES에 어댑터 등록)
// ============================================================

import type {
  AuraState,
  BombEntity,
  BreathState,
  ClawState,
  EnemyState,
  MeleeBlade,
  PlayerState,
  Projectile,
  ShurikenProjectile,
  TrapEntity,
  WeaponInstance,
  WeaponMods,
  WeaponType,
} from "@/game/core/types";
import { updateBullet, renderBullets, cullBullets, resetBulletIds, bulletLevelEffect } from "@/game/weapons/BulletWeapon";
import { updateMelee, renderMelee, createMeleeBlades, meleeLevelEffect } from "@/game/weapons/MeleeWeapon";
import { updateBomb, renderBombs, cullBombs, resetBombIds, bombLevelEffect } from "@/game/weapons/BombWeapon";
import { updateTrap, renderTraps, cullTraps, resetTrapIds, trapLevelEffect } from "@/game/weapons/TrapWeapon";
import { updateAura, renderAura, createAuraState, auraLevelEffect } from "@/game/weapons/AuraWeapon";
import {
  updateShuriken, renderShurikens, cullShurikens, resetShurikenIds, shurikenLevelEffect,
} from "@/game/weapons/ShurikenWeapon";
import { updateClaw, renderClaw, createClawState, resetClaw, clawLevelEffect } from "@/game/weapons/ClawWeapon";
import { createBreathState, updateBreath, renderBreath } from "@/game/weapons/BreathWeapon";

/** 매 프레임 무기 update에 전달되는 공통 인자 */
export interface WeaponUpdateArgs {
  enemies: EnemyState[];
  px: number;
  py: number;
  w: WeaponInstance;
  dt: number;
  onKill: () => void;
  mods: WeaponMods;
  /** Player movement angle (radians). Held while standing still. */
  aim: number;
}

/**
 * 무기 1종의 동작 정의.
 * `S`는 그 무기의 런타임 상태(투사체 배열, 오라 상태 등)이며 WeaponManager가 보관한다.
 */
export interface WeaponModule<S> {
  /** 렌더 순서 — 작을수록 먼저(아래에) 그려진다 */
  renderOrder: number;
  /** 무기를 처음 획득했을 때 런타임 상태 생성 */
  createState(w: WeaponInstance): S;
  /** 레벨업 직후 호출 — 상태를 다시 만들어야 하면 새 상태를 반환 */
  onLevelUp?(state: S, w: WeaponInstance): S;
  /** 진화 직후 호출 — 상태를 다시 만들어야 하면 새 상태를 반환 */
  onEvolve?(state: S, w: WeaponInstance): S;
  /** 매 프레임 로직 (발사·충돌·정리) */
  update(state: S, args: WeaponUpdateArgs): void;
  /** 매 프레임 그리기 (월드 좌표계) */
  render(ctx: CanvasRenderingContext2D, state: S, player: PlayerState, w: WeaponInstance): void;
  /** 모듈 전역 상태(id 카운터, DoT 맵 등) 초기화 — 새 게임 시작 시 호출 */
  resetGlobals?(): void;
  /** `w.level`에 도달하면 얻는 특수 효과 설명. 없으면 null (레벨업 카드·도감에 표시) */
  levelEffect(w: WeaponInstance): string | null;
}

/** 상태 타입을 유지한 채 모듈을 정의하는 헬퍼 */
function defineWeapon<S>(m: WeaponModule<S>): WeaponModule<S> {
  return m;
}

// ---- 무기별 어댑터 -------------------------------------------------------

const bullet = defineWeapon<{ projectiles: Projectile[] }>({
  renderOrder: 3,
  createState: () => ({ projectiles: [] }),
  update: (s, a) => {
    updateBullet(s.projectiles, a.enemies, a.px, a.py, a.w, a.dt, a.onKill, a.mods);
    cullBullets(s.projectiles);
  },
  render: (ctx, s) => renderBullets(ctx, s.projectiles),
  resetGlobals: resetBulletIds,
  levelEffect: bulletLevelEffect,
});

const melee = defineWeapon<{ blades: MeleeBlade[] }>({
  renderOrder: 6,
  createState: (w) => ({ blades: createMeleeBlades(w) }),
  onLevelUp: (_s, w) => ({ blades: createMeleeBlades(w) }),
  onEvolve: (_s, w) => ({ blades: createMeleeBlades(w) }),
  update: (s, a) => updateMelee(s.blades, a.enemies, a.px, a.py, a.w, a.dt, a.onKill, a.mods),
  render: (ctx, s, p, w) => {
    if (s.blades.length > 0) renderMelee(ctx, s.blades, p.x, p.y, w);
  },
  levelEffect: meleeLevelEffect,
});

const bomb = defineWeapon<{ bombs: BombEntity[] }>({
  renderOrder: 2,
  createState: () => ({ bombs: [] }),
  update: (s, a) => {
    updateBomb(s.bombs, a.enemies, a.px, a.py, a.w, a.dt, a.onKill, a.mods);
    cullBombs(s.bombs);
  },
  render: (ctx, s) => renderBombs(ctx, s.bombs),
  resetGlobals: resetBombIds,
  levelEffect: bombLevelEffect,
});

const trap = defineWeapon<{ traps: TrapEntity[] }>({
  renderOrder: 1,
  createState: () => ({ traps: [] }),
  update: (s, a) => {
    updateTrap(s.traps, a.enemies, a.px, a.py, a.w, a.dt, a.onKill, a.mods);
    cullTraps(s.traps);
  },
  render: (ctx, s) => renderTraps(ctx, s.traps),
  resetGlobals: resetTrapIds,
  levelEffect: trapLevelEffect,
});

const aura = defineWeapon<AuraState>({
  renderOrder: 0, // 가장 아래(바닥 장판)
  createState: (w) => createAuraState(w),
  // 레벨업은 updateAura 내부의 lazy refresh가 처리한다
  onEvolve: (_s, w) => createAuraState(w),
  update: (s, a) => updateAura(s, a.enemies, a.px, a.py, a.w, a.dt, a.onKill, a.mods),
  render: (ctx, s, p) => renderAura(ctx, s, p.x, p.y),
  levelEffect: auraLevelEffect,
});

const shuriken = defineWeapon<{ shurikens: ShurikenProjectile[] }>({
  renderOrder: 4,
  createState: () => ({ shurikens: [] }),
  update: (s, a) => {
    updateShuriken(s.shurikens, a.enemies, a.px, a.py, a.w, a.dt, a.onKill, a.mods);
    cullShurikens(s.shurikens);
  },
  render: (ctx, s) => renderShurikens(ctx, s.shurikens),
  resetGlobals: resetShurikenIds,
  levelEffect: shurikenLevelEffect,
});

/** 야생의 발톱 — 진화하면 브레스(전방 화염 입자)로 상태가 교체된다 */
const claw = defineWeapon<{ claw: ClawState | null; breath: BreathState | null }>({
  renderOrder: 5,
  createState: (w) => ({ claw: createClawState(w), breath: null }),
  onLevelUp: (s, w) => ({ ...s, claw: createClawState(w) }),
  onEvolve: (_s, w) => ({ claw: null, breath: createBreathState(w) }),
  update: (s, a) => {
    if (s.breath) updateBreath(s.breath, a.enemies, a.px, a.py, a.w, a.dt, a.onKill, a.mods, a.aim);
    else if (s.claw) updateClaw(s.claw, a.enemies, a.px, a.py, a.w, a.dt, a.onKill, a.mods);
  },
  render: (ctx, s, p, w) => {
    if (s.breath) renderBreath(ctx, s.breath, p.x, p.y);
    else if (s.claw) renderClaw(ctx, s.claw, p.x, p.y, w);
  },
  resetGlobals: resetClaw,
  levelEffect: clawLevelEffect,
});

// ---- 등록표 ------------------------------------------------------------
// Record<WeaponType, …> 이므로 WeaponType에 새 무기를 추가하고 여기 등록하지 않으면
// 타입체크가 실패한다 (누락 방지).

// 무기마다 상태 타입이 달라 표 전체는 상태 타입을 지운 형태로 보관한다.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyWeaponModule = WeaponModule<any>;

export const WEAPON_MODULES: Record<WeaponType, AnyWeaponModule> = {
  bullet,
  melee,
  bomb,
  trap,
  aura,
  shuriken,
  claw,
};

/** 등록된 모든 무기 종류 (등록 순서 = 도감·선택지 순서) */
export const ALL_WEAPON_TYPES = Object.keys(WEAPON_MODULES) as WeaponType[];

/** `level`에 도달했을 때 얻는 특수 효과 설명 */
export function weaponLevelEffectAt(w: WeaponInstance, level: number): string | null {
  return WEAPON_MODULES[w.type].levelEffect({ ...w, level });
}
