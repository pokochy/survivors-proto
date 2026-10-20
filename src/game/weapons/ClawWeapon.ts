// ============================================================
//  weapons/ClawWeapon.ts — Periodic claw slash around player
//  Scratches all enemies within a radius in an arc animation.
// ============================================================

import { CONFIG } from "@/game/data/config";
import type { ClawState, EnemyState, WeaponInstance } from "@/game/core/types";
import { damageEnemy } from "@/game/entities/EnemyManager";
import type { WeaponMods } from "@/game/core/types";
import { EVOLUTIONS } from "@/game/data/evolutions";
import { isLowQuality } from "@/game/render/quality";
import { drawStrip, getPixelImage } from "@/game/render/pixel";

// Claw image — loaded lazily on first render (so this module can also be imported
// outside a browser, e.g. by scripts/gen-spec.mjs), drawn statically at the attack
// direction on each slash. Pre-rendered to an offscreen canvas with the inversion
// filter baked in so we don't pay the per-pixel filter cost every frame.
let clawImage: HTMLImageElement | null = null;
let clawSprite: HTMLCanvasElement | null = null;

function getClawImage(): HTMLImageElement {
  if (clawImage) return clawImage;
  const img = new Image();
  img.onload = () => {
    const cv = document.createElement("canvas");
    cv.width = img.naturalWidth;
    cv.height = img.naturalHeight;
    const cctx = cv.getContext("2d");
    if (cctx) {
      cctx.filter = "invert(1) grayscale(1) contrast(1.1)";
      cctx.drawImage(img, 0, 0);
      cctx.filter = "none";
    }
    clawSprite = cv;
  };
  img.src = "/assets/weapon/claw.PNG";
  clawImage = img;
  return img;
}

// ---- Bleed DoT state stored on enemies (evolved claw only) ----
const enemyBleeds = new Map<
  number,
  { timer: number; tickTimer: number; damage: number }
>();

const BLEED_DURATION = 3.0;
const BLEED_TICK_INTERVAL = 0.5;
const SLASH_ARC = Math.PI * 0.6; // 108°, same cone as the hit check

/** Nearest enemy in range, or a fresh random angle when the area is empty. */
function aimSlash(enemies: EnemyState[], px: number, py: number, range: number): number {
  let best: EnemyState | null = null;
  let bestD2 = range * range;
  for (const e of enemies) {
    if (!e.alive || e.dying) continue;
    const dx = e.x - px;
    const dy = e.y - py;
    const d2 = dx * dx + dy * dy;
    if (d2 >= bestD2) continue;
    bestD2 = d2;
    best = e;
  }
  if (best) return Math.atan2(best.y - py, best.x - px);
  return Math.random() * Math.PI * 2;
}

export function createClawState(w: WeaponInstance): ClawState {
  const d = CONFIG.weapons.claw;
  const state: ClawState = {
    radius: d.baseRadius,
    damage: d.baseDamage,
    cooldown: d.baseCooldown,
    cooldownTimer: 0,
    slashTimer: 0,
    slashDuration: 0.15,
    slashActive: false,
    slashArc: 0,
    slashBaseAngle: 0,
    slashHits: new Set(),
    slashCount: d.baseSlashCount as number,
    slashesRemaining: 0,
    interSlashTimer: 0,
    cachedLevel: 0,
    cachedEvolved: false,
  };
  refreshClaw(state, w);
  return state;
}

function refreshClaw(state: ClawState, w: WeaponInstance): void {
  const d = CONFIG.weapons.claw;
  const evo = w.evolved ? EVOLUTIONS.claw : null;
  state.damage = d.baseDamage * Math.pow(d.damageGrowth, w.level - 1) * (evo?.damageMult ?? 1);
  state.cooldown =
    d.baseCooldown * Math.pow(d.cooldownGrowth, w.level - 1) * (evo?.cooldownMult ?? 1);
  state.radius = d.baseRadius * Math.pow(d.radiusGrowth, w.level - 1) * (w.evolved ? 1.5 : 1);

  // Slash count: 1 base, +1 at Lv4, +1 at Lv7, evolved gets 3 total
  let count = d.baseSlashCount as number;
  if (w.level >= 4) count += 1;
  if (w.level >= 7) count += 1;
  if (w.evolved) count = Math.max(count, 3);
  state.slashCount = count;
}

export function clawDamage(w: WeaponInstance): number {
  const d = CONFIG.weapons.claw;
  const evo = w.evolved ? EVOLUTIONS.claw.damageMult : 1;
  return d.baseDamage * Math.pow(d.damageGrowth, w.level - 1) * evo;
}

export function clawRadius(w: WeaponInstance): number {
  const d = CONFIG.weapons.claw;
  return d.baseRadius * Math.pow(d.radiusGrowth, w.level - 1) * (w.evolved ? 1.5 : 1);
}

export function clawSlashCount(w: WeaponInstance): number {
  let count = CONFIG.weapons.claw.baseSlashCount as number;
  if (w.level >= 4) count += 1;
  if (w.level >= 7) count += 1;
  if (w.evolved) count = Math.max(count, 3);
  return count;
}

export function clawLevelEffect(w: WeaponInstance): string | null {
  if (w.evolved) return null;
  const lv = w.level;
  if (lv === 2) return "데미지 증가";
  if (lv === 3) return "공격 범위 증가";
  if (lv === 4) return "2연속 베기";
  if (lv === 5) return "쿨다운 감소";
  if (lv === 6) return "데미지 증가";
  if (lv === 7) return "3연속 베기";
  if (lv === 8) return "쿨다운 감소 · 최대 강화";
  return null;
}

export function updateClaw(
  state: ClawState,
  enemies: EnemyState[],
  px: number,
  py: number,
  w: WeaponInstance,
  dt: number,
  onKill: () => void,
  mods?: WeaponMods
): void {
  const dmgMult = mods?.damageMult ?? 1;
  const cdMult = mods?.cooldownMult ?? 1;

  // Lazy refresh when level/evolved changes
  if (state.cachedLevel !== w.level || state.cachedEvolved !== w.evolved) {
    refreshClaw(state, w);
    state.cachedLevel = w.level;
    state.cachedEvolved = w.evolved;
  }

  const dmg = state.damage * dmgMult;

  // Process bleed DoTs (evolved only)
  if (w.evolved) {
    processBleeds(enemies, dt, onKill);
  }

  if (state.slashActive) {
    state.slashTimer += dt;

    // Apply damage at the start of each slash
    if (state.slashHits.size === 0 || state.slashArc === 0) {
      // First frame of this slash — damage enemies within the slash arc
      if (state.slashHits.size === 0) {
        const halfSpread = SLASH_ARC / 2;
        const slashAngle = state.slashBaseAngle;
        for (const e of enemies) {
          if (!e.alive || e.dying) continue;
          const dx = e.x - px;
          const dy = e.y - py;
          const collideR = state.radius + e.radius;
          if (dx * dx + dy * dy >= collideR * collideR) continue;
          // Only hit enemies within this slash's arc
          const ang = Math.atan2(dy, dx);
          let delta = ang - slashAngle;
          while (delta > Math.PI) delta -= Math.PI * 2;
          while (delta < -Math.PI) delta += Math.PI * 2;
          if (Math.abs(delta) > halfSpread) continue;
          state.slashHits.add(e.id);
          if (damageEnemy(e, dmg, mods?.critChance)) onKill();
          // Apply bleed (evolved only)
          if (w.evolved) {
            enemyBleeds.set(e.id, {
              timer: BLEED_DURATION,
              tickTimer: 0,
              damage: dmg * 0.3,
            });
          }
        }
      }
    }

    // Animate slash arc (kept for legacy damage-frame logic)
    state.slashArc += dt * 25;

    // End of this slash
    if (state.slashTimer >= state.slashDuration) {
      state.slashActive = false;
      state.slashTimer = 0;
      state.slashHits.clear();
      state.slashArc = 0;
      state.slashesRemaining--;

      if (state.slashesRemaining > 0) {
        // Start next slash after a brief gap
        state.interSlashTimer = 0.02;
      } else {
        // All slashes done — start cooldown
        state.cooldownTimer = state.cooldown * cdMult;
      }
    }
    return;
  }

  // Waiting between multiple slashes
  if (state.interSlashTimer > 0) {
    state.interSlashTimer -= dt;
    if (state.interSlashTimer <= 0) {
      state.slashActive = true;
      state.slashTimer = 0;
      state.slashArc = 0;
      state.slashHits.clear();
      state.slashBaseAngle = aimSlash(enemies, px, py, state.radius + 50);
    }
    return;
  }

  // Cooldown counting
  state.cooldownTimer -= dt;
  if (state.cooldownTimer <= 0) {
    // Start a new attack — trigger first slash
    state.slashActive = true;
    state.slashTimer = 0;
    state.slashArc = 0;
    state.slashHits.clear();
    state.slashesRemaining = state.slashCount;
    state.slashBaseAngle = aimSlash(enemies, px, py, state.radius + 50);
  }
}

function processBleeds(
  enemies: EnemyState[],
  dt: number,
  onKill: () => void
): void {
  for (const [eid, bleed] of enemyBleeds) {
    bleed.timer -= dt;
    bleed.tickTimer += dt;
    if (bleed.timer <= 0) {
      enemyBleeds.delete(eid);
      continue;
    }
    if (bleed.tickTimer >= BLEED_TICK_INTERVAL) {
      bleed.tickTimer = 0;
      const e = enemies.find((en) => en.id === eid && en.alive);
      if (e) {
        if (damageEnemy(e, bleed.damage)) onKill();
      } else {
        enemyBleeds.delete(eid);
      }
    }
  }
}

export function resetClaw(): void {
  enemyBleeds.clear();
}

export function renderClaw(
  ctx: CanvasRenderingContext2D,
  state: ClawState,
  px: number,
  py: number,
  _w: WeaponInstance
): void {
  if (!state.slashActive) {
    // Show subtle range indicator when not slashing
    const color = CONFIG.weapons.claw.color;
    ctx.strokeStyle = color + "0a";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(px, py, state.radius, 0, Math.PI * 2);
    ctx.stroke();
    return;
  }

  const alpha = Math.max(0, 1 - state.slashTimer / state.slashDuration);
  const baseAngle = state.slashBaseAngle;

  // High quality: animated claw-slash sheet (strikes toward +x in the sheet)
  if (!isLowQuality() && getPixelImage("fx/claw")) {
    const prog = Math.min(0.999, state.slashTimer / state.slashDuration);
    const reach = state.radius * 0.6;
    drawStrip(ctx, "fx/claw", prog * 4, px + Math.cos(baseAngle) * reach, py + Math.sin(baseAngle) * reach,
      (state.radius * 1.5) / 32, baseAngle);
    return;
  }

  // Draw the claw PNG statically at the attack direction — one image per slash,
  // centered along the slash direction. Inverted (black/white) via filter.
  const img = getClawImage();
  const sprite: HTMLCanvasElement | HTMLImageElement = clawSprite ?? img;
  if (clawSprite || (img.complete && img.naturalWidth > 0)) {
    const naturalW = clawSprite?.width ?? img.naturalWidth;
    const naturalH = clawSprite?.height ?? img.naturalHeight;
    const scale = (state.radius * 1.6) / naturalW;
    const drawW = naturalW * scale;
    const drawH = naturalH * scale;
    // Place the image so its center sits at the slash reach point.
    const reach = state.radius * 0.75;
    const cx = px + Math.cos(baseAngle) * reach;
    const cy = py + Math.sin(baseAngle) * reach;

    ctx.save();
    ctx.globalAlpha = alpha * 0.9;
    ctx.translate(cx, cy);
    // Rotate to align the image with the attack direction.
    ctx.rotate(baseAngle + Math.PI / 2 + Math.PI / 4);
    ctx.drawImage(sprite, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  }

  // Keep the original impact ring as a subtle hit feedback
  if (alpha > 0.5) {
    const color = CONFIG.weapons.claw.color;
    ctx.save();
    ctx.globalAlpha = (alpha - 0.5) * 0.5;
    ctx.strokeStyle = color + "44";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px, py, state.radius * (1 - alpha) * 0.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}
