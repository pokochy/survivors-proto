// ============================================================
//  weapons/BombWeapon.ts — Delayed AoE explosion at random enemy
// ============================================================

import { CONFIG } from "@/game/data/config";
import type { BombEntity, EnemyState, WeaponInstance } from "@/game/core/types";
import { findNearestEnemy, damageEnemy } from "@/game/entities/EnemyManager";
import type { WeaponMods } from "@/game/core/types";
import { EVOLUTIONS } from "@/game/data/evolutions";
import { getRadialSprite, drawCentered } from "@/game/render/sprites";
import { isLowQuality } from "@/game/render/quality";
import { getIconSprite, getFxSprite, drawSpriteCentered } from "@/game/render/iconSprites";
import { drawStrip, getPixelImage } from "@/game/render/pixel";

/** Burning field as a patch of animated pixel flames (high quality). */
function renderPixelFlames(ctx: CanvasRenderingContext2D, b: BombEntity, now: number, life: number): void {
  const r = b.burnRadius;
  const n = Math.max(4, Math.min(14, Math.round(r / 12)));
  const scale = life > 0.25 ? 2 : 2 * (life / 0.25) + 0.5; // shrink while dying out
  for (let i = 0; i < n; i++) {
    const a = i * 2.39996 + b.id; // golden angle → even spread
    const d = r * 0.85 * Math.sqrt((i + 0.5) / n);
    drawStrip(ctx, "fx/fire", now / 90 + i * 3, b.x + Math.cos(a) * d, b.y + Math.sin(a) * d, scale);
  }
}

/** High-quality bomb visuals; returns false while sprites load. */
function renderPixelBomb(ctx: CanvasRenderingContext2D, b: BombEntity, now: number): boolean {
  if (!getPixelImage("proj/canonball") || !getPixelImage("fx/circle-orange") || !getPixelImage("fx/fire")) return false;
  const color = CONFIG.weapons.bomb.color;
  if (b.phase === "falling") {
    // Impact area stays visible (gameplay info) — outline only on high quality
    ctx.beginPath();
    ctx.arc(b.targetX, b.targetY, b.explosionRadius, 0, Math.PI * 2);
    ctx.strokeStyle = color + "88";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
    if (b.explosionRadius > 150) {
      // Evolved: a meteor (fireball head points up-right in the sheet → +45°)
      drawStrip(ctx, "proj/fireball", now / 80, b.x, b.y, 3, Math.atan2(b.targetY - b.y, b.targetX - b.x) + Math.PI / 4);
    } else {
      drawStrip(ctx, "proj/canonball", now / 70, b.x, b.y, 1.6);
    }
  } else if (b.phase === "exploding") {
    const prog = Math.min(0.999, b.explosionTimer / 0.3);
    drawStrip(ctx, "fx/circle-orange", prog * 4, b.x, b.y, (b.explosionRadius * 2) / 28);
    drawStrip(ctx, "fx/smoke", prog * 6, b.x, b.y, Math.max(2, b.explosionRadius / 16));
  } else if (b.phase === "burning") {
    renderPixelFlames(ctx, b, now, b.burnTimer);
  }
  return true;
}

let idCounter = 5200;
/** Residual flame is 15% of that bomb's explosion hit. */
const BURN_DAMAGE_RATIO = 0.15;
/** One burn hit per enemy per tick, shared by every overlapping field. */
const burnLock = new Map<number, number>();

export function resetBombIds() {
  idCounter = 5200;
  burnLock.clear();
}

export function bombDamage(w: WeaponInstance): number {
  const d = CONFIG.weapons.bomb;
  const evo = w.evolved ? EVOLUTIONS.bomb.damageMult : 1;
  return d.baseDamage * Math.pow(d.damageGrowth, w.level - 1) * evo;
}

export function bombCooldown(w: WeaponInstance): number {
  const d = CONFIG.weapons.bomb;
  const evo = w.evolved ? EVOLUTIONS.bomb.cooldownMult : 1;
  return d.baseCooldown * Math.pow(d.cooldownGrowth, w.level - 1) * evo;
}

export function bombExplosionRadius(w: WeaponInstance): number {
  const d = CONFIG.weapons.bomb;
  let r = d.baseExplosionRadius * Math.pow(d.explosionRadiusGrowth, w.level - 1);
  if (w.evolved) r *= 1.5;
  else if (w.level >= 7) r *= 1.2;
  return r;
}

// Multi-bomb: 1 base, 2 at Lv3, 3 at Lv6, 4 at Lv8
export function bombCount(w: WeaponInstance): number {
  if (w.evolved) return 6;
  if (w.level >= 8) return 4;
  if (w.level >= 6) return 3;
  if (w.level >= 3) return 2;
  return 1;
}

// Burning field: unlocked at Lv5+
export function bombHasBurn(w: WeaponInstance): boolean {
  return w.evolved || w.level >= 5;
}

export function bombLevelEffect(w: WeaponInstance): string | null {
  if (w.evolved) return null;
  const lv = w.level;
  if (lv === 3) return "폭탄 2개 동시 투하";
  if (lv === 5) return "잔류 화염 지대 생성";
  if (lv === 6) return "폭탄 3개 동시 투하";
  if (lv === 7) return "폭발 범위 증가";
  if (lv === 8) return "폭탄 4개 · 화염 강화";
  return null;
}

export function updateBomb(
  bombs: BombEntity[],
  enemies: EnemyState[],
  px: number, py: number,
  w: WeaponInstance,
  dt: number,
  onKill: () => void,
  mods?: WeaponMods
): void {
  const dmgMult = mods?.damageMult ?? 1;
  const cdMult = mods?.cooldownMult ?? 1;
  // Spawn
  w.cooldownTimer += dt;
  if (w.cooldownTimer >= bombCooldown(w) * cdMult) {
    w.cooldownTimer = 0;
    const count = bombCount(w);
    const hasBurn = bombHasBurn(w);
    for (let i = 0; i < count; i++) {
      // Each bomb targets a different random area
      const target = findNearestEnemy(enemies, px, py, 350);
      const jitter = i * 60;
      const tx = target ? target.x + (Math.random() - 0.5) * 60 + jitter : px + (Math.random() - 0.5) * 200;
      const ty = target ? target.y + (Math.random() - 0.5) * 60 : py + (Math.random() - 0.5) * 200;
      bombs.push({
        id: ++idCounter,
        x: px, y: py,
        targetX: tx, targetY: ty,
        fallTimer: 0,
        fallTime: CONFIG.weapons.bomb.baseFallTime,
        explosionRadius: bombExplosionRadius(w),
        damage: bombDamage(w) * dmgMult,
        phase: "falling",
        explosionTimer: 0,
        hitIds: new Set(),
        burnRadius: hasBurn ? bombExplosionRadius(w) * 0.7 : 0,
        burnDamage: hasBurn ? bombDamage(w) * dmgMult * BURN_DAMAGE_RATIO : 0,
        burnDuration: hasBurn ? (w.level >= 8 ? 4 : 2.5) : 0,
        burnTimer: 0,
        burnTickTimer: 0,
        burnHitTimers: new Map(),
      });
    }
  }

  for (const [id, t] of burnLock) {
    const nt = t - dt;
    if (nt <= 0) burnLock.delete(id);
    else burnLock.set(id, nt);
  }

  for (const b of bombs) {
    if (b.phase === "done") continue;

    if (b.phase === "falling") {
      b.fallTimer += dt;
      const t = Math.min(b.fallTimer / b.fallTime, 1);
      b.x = px + (b.targetX - px) * t;
      b.y = py + (b.targetY - py) * t;
      if (t >= 1) {
        b.phase = "exploding";
        b.x = b.targetX;
        b.y = b.targetY;
      }
    }

    if (b.phase === "exploding") {
      b.explosionTimer += dt;
      // Damage all enemies in radius once
      for (const e of enemies) {
        if (!e.alive || b.hitIds.has(e.id)) continue;
        const dx = b.x - e.x;
        const dy = b.y - e.y;
        const collideR = b.explosionRadius + e.radius;
        if (dx * dx + dy * dy < collideR * collideR) {
          b.hitIds.add(e.id);
          if (damageEnemy(e, b.damage, mods?.critChance)) onKill();
        }
      }
      if (b.explosionTimer >= 0.3) {
        // Transition to burn phase or done
        if (b.burnDuration > 0) {
          b.phase = "burning";
        } else {
          b.phase = "done";
        }
      }
    }

    if (b.phase === "burning") {
      b.burnTimer += dt;
      b.burnTickTimer += dt;

      // Decrement burn hit timers
      for (const [eid, t] of b.burnHitTimers) {
        const nt = t - dt;
        if (nt <= 0) b.burnHitTimers.delete(eid);
        else b.burnHitTimers.set(eid, nt);
      }

      // Burn tick damage every 0.5s
      if (b.burnTickTimer >= 0.5) {
        b.burnTickTimer = 0;
        for (const e of enemies) {
          if (!e.alive || b.burnHitTimers.has(e.id) || (burnLock.get(e.id) ?? 0) > 0) continue;
          const dx = b.x - e.x;
          const dy = b.y - e.y;
          const collideR = b.burnRadius + e.radius;
          if (dx * dx + dy * dy < collideR * collideR) {
            b.burnHitTimers.set(e.id, 0.5);
            burnLock.set(e.id, 0.5);
            if (damageEnemy(e, b.burnDamage)) onKill();
          }
        }
      }

      if (b.burnTimer >= b.burnDuration) {
        b.phase = "done";
      }
    }
  }
}

export function cullBombs(bombs: BombEntity[]): BombEntity[] {
  let write = 0;
  for (let i = 0; i < bombs.length; i++) {
    if (bombs[i].phase !== "done") {
      if (write !== i) bombs[write] = bombs[i];
      write++;
    }
  }
  bombs.length = write;
  return bombs;
}

export function renderBombs(ctx: CanvasRenderingContext2D, bombs: BombEntity[]): void {
  const color = CONFIG.weapons.bomb.color;
  const low = isLowQuality();
  const now = Date.now();
  for (const b of bombs) {
    if (!low && renderPixelBomb(ctx, b, now)) continue;
    if (b.phase === "falling") {
      // Shadow at target
      ctx.fillStyle = color + "22";
      ctx.beginPath();
      ctx.arc(b.targetX, b.targetY, b.explosionRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = color + "66";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Falling bomb (icon; meteor once evolved — the shadow above shows the impact area)
      const bombSprite = getIconSprite(b.explosionRadius > 150 ? "weapon-bomb-evo" : "weapon-bomb", color, 22);
      if (bombSprite) {
        drawSpriteCentered(ctx, bombSprite, b.x, b.y);
      } else {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#fbbf24";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    if (b.phase === "exploding") {
      const prog = b.explosionTimer / 0.3;
      const r = b.explosionRadius * (0.5 + prog * 0.5);
      ctx.fillStyle = color + Math.round((1 - prog) * 200).toString(16).padStart(2, "0");
      ctx.beginPath();
      ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Fire burst texture over the blast (decoration)
      if (!low) {
        const fire = getFxSprite("fire_01", "#fdba74", 128);
        if (fire) {
          const s = b.explosionRadius * (1.4 + prog * 0.6);
          ctx.globalAlpha = 1 - prog;
          ctx.drawImage(fire, b.x - s / 2, b.y - s / 2, s, s);
          ctx.globalAlpha = 1;
        }
      }
    }

    if (b.phase === "burning") {
      const prog = 1 - (b.burnTimer / b.burnDuration);
      const r = b.burnRadius;
      const pulse = Math.sin(now / 100) * 0.1 + 0.9;

      // Burning field — cached sprite (center alpha 0x50), faded with globalAlpha
      const field = getRadialSprite(r, [[0, color + "50"], [1, color + "00"]]);
      ctx.globalAlpha = Math.max(0, prog);
      drawCentered(ctx, field, b.x, b.y, r * pulse);
      ctx.globalAlpha = 1;

      // Flickering embers + small flame texture (decoration — skipped in low quality)
      if (low) continue;
      const flame = getFxSprite("flame_01", "#fb923c", 64);
      if (flame) {
        const fs = r * (0.9 + Math.sin(now / 90 + b.id) * 0.1);
        ctx.globalAlpha = Math.max(0, prog) * 0.55;
        ctx.drawImage(flame, b.x - fs / 2, b.y - fs * 0.6, fs, fs);
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = "#fbbf24" + Math.round(prog * 150).toString(16).padStart(2, "0");
      for (let i = 0; i < 3; i++) {
        const a = (now / 500 + i * 2) % (Math.PI * 2);
        const ex = b.x + Math.cos(a) * r * 0.5;
        const ey = b.y + Math.sin(a) * r * 0.5;
        ctx.beginPath();
        ctx.arc(ex, ey, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}
