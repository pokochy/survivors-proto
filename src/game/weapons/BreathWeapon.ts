// ============================================================
//  weapons/BreathWeapon.ts — Frontal flame spray (evolved claw)
//  Pours small flame particles forward. A particle hurts an enemy
//  it touches, at most once per tick, and leaves a burn DoT.
//  Evolved weapons are final form — no level scaling.
// ============================================================

import { CONFIG } from "@/game/data/config";
import type { BreathParticle, BreathState, EnemyState, WeaponInstance } from "@/game/core/types";
import { damageEnemy } from "@/game/entities/EnemyManager";
import type { WeaponMods } from "@/game/core/types";
import { EVOLUTIONS } from "@/game/data/evolutions";
import { isLowQuality } from "@/game/render/quality";
import { drawStrip, drawTintedStrip, getPixelImage } from "@/game/render/pixel";

const BURN_DURATION = 3.0;
const BURN_TICK_INTERVAL = 0.5;
const BREATH_DURATION = 0.8;
const TICK_INTERVAL = 0.12;
/** Half of the 60° spray. */
const SPRAY_HALF = Math.PI / 6;
const SPAWN_EVERY = 0.035;
const PER_SPAWN = 4;
const MAX_PARTICLES = 56;
const SUPER_PARTICLES = 96;
const PARTICLE_HIT = 7;
/** Seconds for a particle to cross `range`. */
const TRAVEL = 0.5;

export function createBreathState(w: WeaponInstance): BreathState {
  const clawD = CONFIG.weapons.claw;
  const evo = EVOLUTIONS.claw;
  const baseDamage =
    clawD.baseDamage * Math.pow(clawD.damageGrowth, 7) * (evo.damageMult ?? 1);
  const baseCooldown =
    clawD.baseCooldown *
    Math.pow(clawD.cooldownGrowth, 7) *
    (evo.cooldownMult ?? 1);
  const rainbow = !!w.super;
  const state: BreathState = {
    range: clawD.baseRadius * 2.6 * (rainbow ? 1.5 : 1),
    coneAngle: SPRAY_HALF * (rainbow ? 1.5 : 1),
    damage: baseDamage,
    cooldown: baseCooldown,
    cooldownTimer: 0,
    breathTimer: 0,
    breathDuration: BREATH_DURATION,
    breathActive: rainbow,
    continuous: rainbow,
    facing: 0,
    tickInterval: TICK_INTERVAL,
    tickTimer: 0,
    spawnTimer: 0,
    particles: [],
    hitTimers: new Map(),
    enemyBurns: new Map(),
    cachedLevel: 0,
  };
  return state;
}

export function breathDamage(_w: WeaponInstance): number {
  const clawD = CONFIG.weapons.claw;
  const evo = EVOLUTIONS.claw;
  return clawD.baseDamage * Math.pow(clawD.damageGrowth, 7) * (evo.damageMult ?? 1);
}

export function breathRange(_w: WeaponInstance): number {
  return CONFIG.weapons.claw.baseRadius * 2.6;
}

export function resetBreath(): void {
  // Breath state is recreated on evolve/reset, so nothing module-level to clear.
}

export function updateBreath(
  state: BreathState,
  enemies: EnemyState[],
  px: number,
  py: number,
  _w: WeaponInstance,
  dt: number,
  onKill: () => void,
  mods?: WeaponMods,
  aim = Math.PI / 2
): void {
  const dmgMult = mods?.damageMult ?? 1;
  const cdMult = mods?.cooldownMult ?? 1;

  // Emission follows movement even mid-breath. Particles already in flight keep their heading.
  state.facing = aim;

  processBurns(state, enemies, dt, onKill);
  coolHits(state, dt);
  moveParticles(state, enemies, dt, onKill, dmgMult, mods?.critChance);

  if (state.breathActive) {
    state.breathTimer += dt;
    emitParticles(state, px, py, dt);
    if (!state.continuous && state.breathTimer >= state.breathDuration) {
      state.breathActive = false;
      state.breathTimer = 0;
      state.tickTimer = 0;
      state.spawnTimer = 0;
      state.cooldownTimer = state.cooldown * cdMult;
    }
    return;
  }

  state.cooldownTimer -= dt;
  if (state.cooldownTimer <= 0) {
    state.breathActive = true;
    state.breathTimer = 0;
    state.tickTimer = 0;
    state.spawnTimer = 0;
  }
}

function coolHits(state: BreathState, dt: number): void {
  for (const [id, t] of state.hitTimers) {
    const next = t - dt;
    if (next <= 0) state.hitTimers.delete(id);
    else state.hitTimers.set(id, next);
  }
}

function emitParticles(state: BreathState, px: number, py: number, dt: number): void {
  const speed = state.range / TRAVEL;
  const ox = px + Math.cos(state.facing) * 14;
  const oy = py + Math.sin(state.facing) * 14;
  const cap = state.continuous ? SUPER_PARTICLES : MAX_PARTICLES;
  const per = state.continuous ? 5 : PER_SPAWN;
  state.spawnTimer += dt;
  while (state.spawnTimer >= SPAWN_EVERY && state.particles.length < cap) {
    state.spawnTimer -= SPAWN_EVERY;
    for (let n = 0; n < per && state.particles.length < cap; n++) {
      const ang = state.facing + (Math.random() - 0.5) * 2 * state.coneAngle;
      const spd = speed * (0.72 + Math.random() * 0.5);
      const p: BreathParticle = {
        x: ox,
        y: oy,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        life: TRAVEL * (0.85 + Math.random() * 0.2),
        frame: Math.floor(Math.random() * 4),
        hue: state.continuous ? (state.breathTimer * 280 + n * 28) % 360 : -1,
      };
      state.particles.push(p);
    }
  }
}

function moveParticles(
  state: BreathState,
  enemies: EnemyState[],
  dt: number,
  onKill: () => void,
  dmgMult: number,
  critChance: number | undefined
): void {
  const dmg = state.damage * dmgMult;
  const list = state.particles;
  let i = 0;
  while (i < list.length) {
    const p = list[i];
    p.life -= dt;
    if (p.life <= 0) {
      list[i] = list[list.length - 1];
      list.pop();
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    for (const e of enemies) {
      if (!e.alive || e.dying) continue;
      if (state.hitTimers.has(e.id)) continue;
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const reach = PARTICLE_HIT + e.radius;
      if (dx * dx + dy * dy > reach * reach) continue;
      if (damageEnemy(e, dmg, critChance)) onKill();
      state.hitTimers.set(e.id, state.tickInterval);
      state.enemyBurns.set(e.id, {
        timer: BURN_DURATION,
        tickTimer: 0,
        damage: dmg * 0.25,
      });
    }
    i++;
  }
}

function processBurns(
  state: BreathState,
  enemies: EnemyState[],
  dt: number,
  onKill: () => void
): void {
  for (const [eid, burn] of state.enemyBurns) {
    burn.timer -= dt;
    burn.tickTimer += dt;
    if (burn.timer <= 0) {
      state.enemyBurns.delete(eid);
      continue;
    }
    if (burn.tickTimer >= BURN_TICK_INTERVAL) {
      burn.tickTimer = 0;
      const e = enemies.find((en) => en.id === eid && en.alive);
      if (e) {
        if (damageEnemy(e, burn.damage)) onKill();
      } else {
        state.enemyBurns.delete(eid);
      }
    }
  }
}

export function renderBreath(
  ctx: CanvasRenderingContext2D,
  state: BreathState,
  px: number,
  py: number
): void {
  if (!state.breathActive) {
    const color = CONFIG.weapons.claw.color;
    ctx.strokeStyle = color + "08";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(px, py, state.range, 0, Math.PI * 2);
    ctx.stroke();
  }

  const particles = state.particles;
  if (particles.length === 0) return;

  const rainbow = state.continuous;

  // High quality: each particle is one small flame cell. Rainbow tints are cached.
  if (!isLowQuality() && getPixelImage("fx/fire")) {
    for (const p of particles) {
      if (rainbow && p.hue >= 0) {
        const hue = (Math.round(p.hue / 30) * 30) % 360;
        drawTintedStrip(ctx, "fx/fire", p.frame, p.x, p.y, 1.45, 0, `hsl(${hue}, 95%, 58%)`, 0.88);
      } else {
        drawStrip(ctx, "fx/fire", p.frame, p.x, p.y, 1.35, 0);
      }
    }
    return;
  }

  if (rainbow) {
    for (let h = 0; h < 360; h += 30) {
      ctx.fillStyle = `hsl(${h}, 95%, 58%)`;
      ctx.beginPath();
      let any = false;
      for (const p of particles) {
        if ((Math.round(p.hue / 30) * 30) % 360 !== h) continue;
        any = true;
        ctx.moveTo(p.x + 3.5, p.y);
        ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
      }
      if (any) ctx.fill();
    }
    return;
  }

  ctx.fillStyle = "#fb923c";
  ctx.beginPath();
  for (const p of particles) {
    ctx.moveTo(p.x + 3.5, p.y);
    ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.fillStyle = "#fde68a";
  ctx.beginPath();
  for (const p of particles) {
    ctx.moveTo(p.x + 1.6, p.y);
    ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
  }
  ctx.fill();
}
