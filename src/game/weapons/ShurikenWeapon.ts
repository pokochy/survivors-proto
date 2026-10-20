// ============================================================
//  weapons/ShurikenWeapon.ts — Multi-throw piercing blade
// ============================================================

import { CONFIG } from "@/game/data/config";
import type { EnemyState, WeaponInstance, ShurikenProjectile } from "@/game/core/types";
import { findNearestEnemy, damageEnemy } from "@/game/entities/EnemyManager";
import type { WeaponMods } from "@/game/core/types";
import { EVOLUTIONS } from "@/game/data/evolutions";
import { getIconSprite, drawSpriteRotated } from "@/game/render/iconSprites";
import { isLowQuality } from "@/game/render/quality";
import { drawStrip } from "@/game/render/pixel";

let idCounter = 5800;
export function resetShurikenIds() { idCounter = 5800; }

export function shurikenDamage(w: WeaponInstance): number {
  const d = CONFIG.weapons.shuriken;
  const evo = w.evolved ? EVOLUTIONS.shuriken.damageMult : 1;
  return d.baseDamage * Math.pow(d.damageGrowth, w.level - 1) * evo;
}

export function shurikenCooldown(w: WeaponInstance): number {
  const d = CONFIG.weapons.shuriken;
  const evo = w.evolved ? EVOLUTIONS.shuriken.cooldownMult : 1;
  return d.baseCooldown * Math.pow(d.cooldownGrowth, w.level - 1) * evo;
}

export function shurikenSpeed(w: WeaponInstance): number {
  const d = CONFIG.weapons.shuriken;
  return d.baseProjectileSpeed * Math.pow(d.speedGrowth, w.level - 1);
}

export function shurikenPierce(w: WeaponInstance): number {
  if (w.evolved) return 999;
  const d = CONFIG.weapons.shuriken;
  return d.basePierce + Math.floor((w.level - 1) / 2);
}

export function shurikenCount(w: WeaponInstance): number {
  if (w.super) return 20;
  if (w.evolved) return 8;
  if (w.level >= 8) return 5;
  if (w.level >= 6) return 4;
  if (w.level >= 4) return 3;
  if (w.level >= 2) return 2;
  return 1;
}

export function shurikenRadius(w: WeaponInstance): number {
  const base = CONFIG.weapons.shuriken.baseProjectileRadius;
  if (w.evolved) return base * 1.6;
  if (w.level >= 7) return base * 1.4;
  return base;
}

export function shurikenLevelEffect(w: WeaponInstance): string | null {
  if (w.evolved) return null;
  const lv = w.level;
  if (lv === 2) return "비도 2개 동시 투척";
  if (lv === 3) return "관통 +1";
  if (lv === 4) return "비도 3개 동시 투척";
  if (lv === 5) return "관통 +1";
  if (lv === 6) return "비도 4개 동시 투척";
  if (lv === 7) return "비도 강화 · 크기 증가";
  if (lv === 8) return "비도 5개 · 관통 +1";
  return null;
}

export function updateShuriken(
  projectiles: ShurikenProjectile[],
  enemies: EnemyState[],
  px: number, py: number,
  w: WeaponInstance,
  dt: number,
  onKill: () => void,
  mods?: WeaponMods
): void {
  const dmgMult = mods?.damageMult ?? 1;
  const cdMult = mods?.cooldownMult ?? 1;
  w.cooldownTimer += dt;
  const cd = shurikenCooldown(w) * cdMult;
  if (w.cooldownTimer >= cd) {
    w.cooldownTimer = 0;
    const target = findNearestEnemy(enemies, px, py, CONFIG.weapons.shuriken.baseRange);
    if (target) {
      const dx = target.x - px;
      const dy = target.y - py;
      const baseAngle = Math.atan2(dy, dx);
      const speed = shurikenSpeed(w);
      const count = shurikenCount(w);
      const radius = shurikenRadius(w);
      const pierce = shurikenPierce(w);

      // Normal evolution is a fan. Super evolution (Linya) fills the whole circle.
      const fullRing = w.super;
      const spread = !fullRing && count > 1 ? 0.22 : 0;
      for (let i = 0; i < count; i++) {
        const offset = !fullRing && count > 1 ? (i - (count - 1) / 2) * spread : 0;
        const angle = fullRing ? baseAngle + (i / count) * Math.PI * 2 : baseAngle + offset;
        projectiles.push({
          id: ++idCounter,
          x: px, y: py,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius,
          damage: shurikenDamage(w) * dmgMult,
          pierce,
          hitIds: new Set(),
          alive: true,
          color: CONFIG.weapons.shuriken.color,
          rotation: 0,
          returning: false,
          originX: px,
          originY: py,
          traveled: 0,
        });
      }
    }
  }

  for (const p of projectiles) {
    if (!p.alive) continue;
    p.rotation += dt * 20;
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    const vxdt = p.vx * dt;
    const vydt = p.vy * dt;

    // Boomerang: after ~300px, arc back toward the player (not the throw point).
    if (w.evolved) {
      p.traveled += Math.sqrt(vxdt * vxdt + vydt * vydt);
      if (!p.returning && p.traveled > 300) {
        p.returning = true;
        p.hitIds.clear(); // can hit again on return
      }
      if (p.returning) {
        const dx = px - p.x;
        const dy = py - p.y;
        const dist2 = dx * dx + dy * dy;
        if (dist2 < 36 * 36) { p.alive = false; continue; }
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy) || shurikenSpeed(w);
        const desired = Math.atan2(dy, dx);
        const current = Math.atan2(p.vy, p.vx);
        let delta = desired - current;
        if (delta > Math.PI) delta -= Math.PI * 2;
        else if (delta < -Math.PI) delta += Math.PI * 2;
        const maxTurn = 7 * dt;
        const turn = delta > maxTurn ? maxTurn : delta < -maxTurn ? -maxTurn : delta;
        const angle = current + turn;
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
      }
    } else {
      const pdx = p.x - px;
      const pdy = p.y - py;
      const maxDist2 = (CONFIG.canvasWidth * 0.8) * (CONFIG.canvasWidth * 0.8);
      if (pdx * pdx + pdy * pdy > maxDist2) {
        p.alive = false;
        continue;
      }
    }
    for (const e of enemies) {
      if (!e.alive || p.hitIds.has(e.id)) continue;
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const collideR = p.radius + e.radius;
      if (dx * dx + dy * dy < collideR * collideR) {
        p.hitIds.add(e.id);
        if (damageEnemy(e, p.damage, mods?.critChance)) onKill();
        p.pierce--;
        if (p.pierce <= 0) { p.alive = false; break; }
      }
    }
  }
}

export function cullShurikens(projectiles: ShurikenProjectile[]): ShurikenProjectile[] {
  let write = 0;
  for (let i = 0; i < projectiles.length; i++) {
    if (projectiles[i].alive) {
      if (write !== i) projectiles[write] = projectiles[i];
      write++;
    }
  }
  projectiles.length = write;
  return projectiles;
}

export function renderShurikens(ctx: CanvasRenderingContext2D, projectiles: ShurikenProjectile[]): void {
  const pixel = !isLowQuality();
  for (const p of projectiles) {
    if (!p.alive) continue;
    // Same kunai/dagger on the way out and on the way back. Point it along its velocity.
    const facing = Math.atan2(p.vy, p.vx);
    if (pixel) {
      const ok = drawStrip(ctx, "proj/kunai", 0, p.x, p.y, 2, facing);
      if (ok) continue;
    }
    const size = p.radius * 3;
    const sprite = getIconSprite("proj-dagger", p.color, size);
    if (sprite) {
      drawSpriteRotated(ctx, sprite, p.x, p.y, p.rotation, size + 4);
      continue;
    }
    // Fallback while the sprite loads: original diamond
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.fillStyle = p.color;
    ctx.strokeStyle = p.color + "88";
    ctx.lineWidth = 2;
    const s = p.radius;
    ctx.beginPath();
    ctx.moveTo(s, 0);
    ctx.lineTo(0, s);
    ctx.lineTo(-s, 0);
    ctx.lineTo(0, -s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}
