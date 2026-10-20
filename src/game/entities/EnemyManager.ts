// ============================================================
//  EnemyManager.ts — Spawning, tracking, collision, death
// ============================================================

import { CONFIG, eliteHp, enemyCap, enemyHpScale, regularSpawnInterval } from "@/game/data/config";
import { playHitSound } from "@/game/core/audio";
import type { EnemyState, PlayerState } from "@/game/core/types";
import { isLowQuality } from "@/game/render/quality";
import { getIconSprite, drawSpriteCentered } from "@/game/render/iconSprites";
import { UI_ICONS } from "@/assets/icons/map";
import { drawUnit, drawShadow, facingFromVector } from "@/game/render/pixel";
import { enemySheet } from "@/assets/pixel/catalog";

/** Walk frames per second for pixel-sprite enemies. */
const ENEMY_WALK_FPS = 6;
/** Sprite size relative to the collision radius (16px frame → radius × this px). */
const ENEMY_SPRITE_PER_RADIUS = 3;

type EnemyTypeConfig = {
  id: string;
  name: string;
  color: string;
  borderColor: string;
  radius: number;
  hp: number;
  speed: number;
  damage: number;
  spawnWeight: number;
  unlockedTime: number;
  shape: "circle" | "triangle" | "square" | "diamond" | "hexagon" | "star" | "sprite";
};

// ---- Sprite sheet constants (Wolf.png) ----
const WOLF_COLS = 4;
const WOLF_ROWS = 14;
const WOLF_ROW_WALK_RIGHT = 4;
const WOLF_ROW_WALK_LEFT  = 5;
const WOLF_FRAME_DURATION = 0.14; // seconds per frame

// Lazy-loaded sprite image
let wolfImage: HTMLImageElement | null = null;
let wolfImageLoaded = false;

function getWolfImage(): HTMLImageElement | null {
  if (wolfImage) return wolfImageLoaded ? wolfImage : null;
  wolfImage = new Image();
  wolfImage.src = "/assets/enemy/Wolf.png";
  wolfImage.onload = () => { wolfImageLoaded = true; };
  return null;
}

let idCounter = 1000;
let spawnTimer = 0;
let eliteTimer = 0;
let eliteSpawned = 0;

/** Set from the active run's constraints. Defaults leave spawning unchanged. */
let enemyRun = { hp: 1, damage: 1, speed: 1, hpGrowth: 1, spawn: 1 };

export function setEnemyConstraints(mods: {
  hp: number;
  damage: number;
  speed: number;
  hpGrowth: number;
  spawn: number;
}): void {
  enemyRun = mods;
}

export function resetEnemyManager(): void {
  spawnTimer = 0;
  idCounter = 1000;
  eliteTimer = 0;
  eliteSpawned = 0;
}

export function getEliteSpawned(): number {
  return eliteSpawned;
}

function createEliteEnemy(elapsedTime: number, px: number, py: number): EnemyState {
  const pos = spawnEdgePosition(px, py);
  const t = pickType(elapsedTime);
  const ec = CONFIG.elite;
  const hp = eliteHp(elapsedTime, enemyRun.hpGrowth) * enemyRun.hp;
  return {
    id: ++idCounter,
    x: pos.x,
    y: pos.y,
    radius: t.radius * ec.radiusMult,
    hp,
    maxHp: hp,
    alive: true,
    speed: t.speed * ec.speedMult * enemyRun.speed,
    baseSpeed: t.speed * ec.speedMult * enemyRun.speed,
    damage: t.damage * ec.damageMult * enemyRun.damage,
    contactTimer: 0,
    enemyType: t.id,
    color: ec.color,
    borderColor: ec.borderColor,
    shape: t.shape,
    spriteFrame: 0,
    spriteTimer: 0,
    facingRight: true,
    dying: false,
    dyingTimer: 0,
    isElite: true,
    gemDropped: false,
    eliteLife: CONFIG.elite.killSeconds,
    facing: 0,
  };
}

function spawnEdgePosition(px: number, py: number): { x: number; y: number } {
  const w = CONFIG.canvasWidth;
  const h = CONFIG.canvasHeight;
  const side = Math.floor(Math.random() * 4);
  const margin = 40;
  switch (side) {
    case 0: return { x: px + (Math.random() - 0.5) * w, y: py - h / 2 - margin };
    case 1: return { x: px + w / 2 + margin, y: py + (Math.random() - 0.5) * h };
    case 2: return { x: px + (Math.random() - 0.5) * w, y: py + h / 2 + margin };
    default: return { x: px - w / 2 - margin, y: py + (Math.random() - 0.5) * h };
  }
}

function getAvailableTypes(elapsedTime: number): readonly EnemyTypeConfig[] {
  return CONFIG.enemyTypes.filter((t) => elapsedTime >= t.unlockedTime);
}

function pickType(elapsedTime: number): EnemyTypeConfig {
  const available = getAvailableTypes(elapsedTime);
  const totalWeight = available.reduce((sum, t) => sum + t.spawnWeight, 0);
  let roll = Math.random() * totalWeight;
  for (const t of available) {
    roll -= t.spawnWeight;
    if (roll <= 0) return t;
  }
  return available[0];
}

function createEnemy(elapsedTime: number, px: number, py: number): EnemyState {
  const pos = spawnEdgePosition(px, py);
  const t = pickType(elapsedTime);
  const variance = 0.8 + Math.random() * 0.4;
  const hp = t.hp * enemyHpScale(elapsedTime, enemyRun.hpGrowth) * enemyRun.hp;
  return {
    id: ++idCounter,
    x: pos.x,
    y: pos.y,
    radius: t.radius,
    hp,
    maxHp: hp,
    alive: true,
    speed: t.speed * variance * enemyRun.speed,
    baseSpeed: t.speed * variance * enemyRun.speed,
    damage: t.damage * enemyRun.damage,
    contactTimer: 0,
    enemyType: t.id,
    color: t.color,
    borderColor: t.borderColor,
    shape: t.shape,
    spriteFrame: 0,
    spriteTimer: 0,
    facingRight: true,
    dying: false,
    dyingTimer: 0,
    isElite: false,
    gemDropped: false,
    facing: 0,
  };
}

export function updateEnemies(
  enemies: EnemyState[],
  player: PlayerState,
  dt: number
): void {
  if (enemies.length < enemyCap(_elapsedTime)) {
    spawnTimer += dt;
    const interval = regularSpawnInterval(_elapsedTime) * enemyRun.spawn;
    // Catch up when the interval is shorter than a frame. Stop if it is not a positive number.
    while (interval > 0 && spawnTimer >= interval && enemies.length < enemyCap(_elapsedTime)) {
      spawnTimer -= interval;
      enemies.push(createEnemy(_elapsedTime, player.x, player.y));
    }
  }

  // Elite spawn every interval
  eliteTimer += dt;
  if (eliteTimer >= CONFIG.elite.spawnInterval) {
    eliteTimer = 0;
    eliteSpawned++;
    enemies.push(createEliteEnemy(_elapsedTime, player.x, player.y));
  }

  for (const e of enemies) {
    if (!e.alive) continue;

    // Reset speed to base each frame so trap slow doesn't compound permanently
    e.speed = e.baseSpeed;

    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    e.facing = facingFromVector(dx, dy, e.facing);

    // Sprite animation updates. Wolves die instantly, same as the other enemies.
    if (e.shape === "sprite") {
      // Walk animation
      e.spriteTimer += dt;
      if (e.spriteTimer >= WOLF_FRAME_DURATION) {
        e.spriteTimer -= WOLF_FRAME_DURATION;
        e.spriteFrame = (e.spriteFrame + 1) % WOLF_COLS;
      }

      // Determine facing direction from movement
      if (Math.abs(dx) > 1) {
        e.facingRight = dx > 0;
      }
    }

    if (dist > 0.1) {
      // Distance-based speed boost: far enemies move faster to catch up,
      // smoothly decelerating to base speed as they get close.
      // Boost starts beyond ~150px and maxes at ~1.8x around the spawn distance (~500px).
      const nearDist = 150;
      const farDist = 500;
      let speedMult = 1;
      if (dist > nearDist) {
        const t = Math.min((dist - nearDist) / (farDist - nearDist), 1);
        speedMult = 1 + t * 1.6; // up to 2.6x at far distance
      }
      e.x += (dx / dist) * e.speed * speedMult * dt;
      e.y += (dy / dist) * e.speed * speedMult * dt;
    }

    if (e.contactTimer > 0) e.contactTimer -= dt;

    const collideDist = e.radius + player.radius;
    if (dist < collideDist && e.contactTimer <= 0) {
      e.contactTimer = CONFIG.enemy.contactDamageCooldown;
    }
  }
}

let _elapsedTime = 0;

export function setElapsedTime(t: number): void {
  _elapsedTime = t;
}

export function checkContactDamage(
  enemies: EnemyState[],
  player: PlayerState
): number {
  let totalDamage = 0;
  for (const e of enemies) {
    if (!e.alive) continue;
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const collideR = e.radius + player.radius;
    if (dx * dx + dy * dy < collideR * collideR && e.contactTimer <= 0) {
      totalDamage += e.damage;
      e.contactTimer = CONFIG.enemy.contactDamageCooldown;
    }
  }
  return totalDamage;
}

export function damageEnemy(enemy: EnemyState, dmg: number, critChance: number = 0, critMult: number = 2): boolean {
  if (!enemy.alive || enemy.dying) return false;
  let finalDmg = dmg;
  if (critChance > 0 && Math.random() < critChance) {
    finalDmg = dmg * critMult;
  }
  playHitSound();
  enemy.hp -= finalDmg;
  if (enemy.hp <= 0) {
    enemy.alive = false;
    return true;
  }
  return false;
}

export function findNearestEnemy(
  enemies: EnemyState[],
  x: number,
  y: number,
  range: number
): EnemyState | null {
  let nearest: EnemyState | null = null;
  let nearestDist2 = range * range;
  for (const e of enemies) {
    if (!e.alive || e.dying) continue;
    const dx = e.x - x;
    const dy = e.y - y;
    const d2 = dx * dx + dy * dy;
    if (d2 < nearestDist2) {
      nearestDist2 = d2;
      nearest = e;
    }
  }
  return nearest;
}

// ---- Shape rendering helpers ----

function drawShape(
  ctx: CanvasRenderingContext2D,
  shape: EnemyState["shape"],
  x: number,
  y: number,
  r: number
): void {
  ctx.beginPath();
  switch (shape) {
    case "circle":
      ctx.arc(x, y, r, 0, Math.PI * 2);
      break;
    case "triangle":
      ctx.moveTo(x, y - r);
      ctx.lineTo(x + r * 0.866, y + r * 0.5);
      ctx.lineTo(x - r * 0.866, y + r * 0.5);
      ctx.closePath();
      break;
    case "square":
      ctx.rect(x - r, y - r, r * 2, r * 2);
      break;
    case "diamond":
      ctx.moveTo(x, y - r);
      ctx.lineTo(x + r, y);
      ctx.lineTo(x, y + r);
      ctx.lineTo(x - r, y);
      ctx.closePath();
      break;
    case "hexagon":
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 2;
        const px = x + r * Math.cos(a);
        const py = y + r * Math.sin(a);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
    case "star":
      for (let i = 0; i < 10; i++) {
        const a = (Math.PI / 5) * i - Math.PI / 2;
        const rr = i % 2 === 0 ? r : r * 0.5;
        const px = x + rr * Math.cos(a);
        const py = y + rr * Math.sin(a);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
  }
}

function renderWolfSprite(
  ctx: CanvasRenderingContext2D,
  e: EnemyState
): void {
  const img = getWolfImage();
  if (!img) {
    // Fallback circle while image loads
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
    ctx.fillStyle = e.color;
    ctx.fill();
    return;
  }

  const fw = img.width / WOLF_COLS;
  const fh = img.height / WOLF_ROWS;

  const row = e.facingRight ? WOLF_ROW_WALK_RIGHT : WOLF_ROW_WALK_LEFT;

  const col = e.spriteFrame;
  const sx = col * fw;
  const sy = row * fh;

  // Draw sprite centered on entity position, scaled to 2x radius
  const drawSize = e.radius * 3.5;
  const crisp = !isLowQuality(); // nearest-neighbour like the other pixel sprites (low keeps the old look)
  if (crisp) ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    img,
    sx, sy, fw, fh,
    e.x - drawSize / 2,
    e.y - drawSize / 2,
    drawSize,
    drawSize
  );
  if (crisp) ctx.imageSmoothingEnabled = true;

  // HP bar if damaged
  if (e.hp < e.maxHp && !e.dying) {
    const barW = e.radius * 2.5;
    const barH = 3;
    const bx = e.x - barW / 2;
    const by = e.y - drawSize / 2 - 5;
    ctx.fillStyle = "#333";
    ctx.fillRect(bx, by, barW, barH);
    ctx.fillStyle = "#f87171";
    ctx.fillRect(bx, by, barW * (e.hp / e.maxHp), barH);
  }
}

/** HP bar above an enemy (gameplay info, every quality). `top` = y of the sprite's top edge. */
function drawHpBar(ctx: CanvasRenderingContext2D, e: EnemyState, top: number): void {
  if (e.hp >= e.maxHp || e.dying) return;
  const barW = Math.max(16, e.radius * 2);
  const bx = e.x - barW / 2;
  const by = top - 5;
  ctx.fillStyle = "#1f2937";
  ctx.fillRect(bx - 1, by - 1, barW + 2, 5);
  ctx.fillStyle = e.isElite ? "#fbbf24" : "#f87171";
  ctx.fillRect(bx, by, barW * (e.hp / e.maxHp), 3);
}

/**
 * High quality: the enemy's own pixel sprite, facing the player, with a shadow.
 * Elites get a gold-tinted copy (built once) + a gold ring under their feet.
 * @returns false while the sheet is loading (caller draws the shape instead)
 */
function renderEnemySprite(ctx: CanvasRenderingContext2D, e: EnemyState, now: number): boolean {
  const sheet = enemySheet(e.enemyType);
  if (!sheet) return false;
  const size = e.radius * ENEMY_SPRITE_PER_RADIUS;
  const scale = size / 16;
  const frame = Math.floor(now * 0.001 * ENEMY_WALK_FPS + e.id * 0.37);
  if (e.isElite) {
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(e.x, e.y + size * 0.42, e.radius * 0.9, e.radius * 0.35, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  const ok = drawUnit(ctx, sheet, e.facing, frame, e.x, e.y, scale,
    e.isElite ? { tint: "#fbbf24", tintAmount: 0.3 } : undefined);
  if (!ok) return false;
  drawHpBar(ctx, e, e.y - size / 2);
  return true;
}

export function renderEnemies(ctx: CanvasRenderingContext2D, enemies: EnemyState[]): void {
  const low = isLowQuality();
  const now = performance.now();
  const pulse = 0.6 + Math.sin(now * 0.005) * 0.2;
  for (const e of enemies) {
    if (!e.alive && !e.dying) continue;

    if (!low && e.shape !== "sprite" && renderEnemySprite(ctx, e, now)) continue;
    if (!low && e.shape === "sprite") drawShadow(ctx, e.x, e.y + e.radius * 1.1, e.radius / 8);

    if (e.isElite) {
      // Golden glow aura for elite enemies (ring always; soft fill is decoration)
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius + 8, 0, Math.PI * 2);
      if (!low) {
        ctx.fillStyle = `rgba(251, 191, 36, ${pulse * 0.25})`;
        ctx.fill();
      }
      ctx.strokeStyle = `rgba(251, 191, 36, ${pulse})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    if (e.shape === "sprite") {
      renderWolfSprite(ctx, e);
      continue;
    }

    // Dying sprite-based enemies skip shape draw (handled above)
    drawShape(ctx, e.shape, e.x, e.y, e.radius);
    ctx.fillStyle = e.color;
    ctx.fill();

    ctx.strokeStyle = e.isElite ? "#fbbf24" : e.borderColor;
    ctx.lineWidth = e.isElite ? 2.5 : 1.5;
    ctx.stroke();

    // Emblem inside the shape (decoration — the shape/color already identify the enemy)
    if (!low) {
      const emblem = getIconSprite(`enemy-${e.enemyType}`, e.borderColor, Math.round(e.radius * 1.25), null);
      if (emblem) drawSpriteCentered(ctx, emblem, e.x, e.y + (e.shape === "triangle" ? e.radius * 0.15 : 0));
    }

    if (e.hp < e.maxHp) {
      const barW = e.radius * 2;
      const barH = 3;
      const bx = e.x - e.radius;
      const by = e.y - e.radius - 6;
      ctx.fillStyle = "#333";
      ctx.fillRect(bx, by, barW, barH);
      ctx.fillStyle = e.isElite ? "#fbbf24" : "#f87171";
      ctx.fillRect(bx, by, barW * (e.hp / e.maxHp), barH);
    }
  }
}

/** Crown above elites so they are recognizable even inside a crowd (gameplay info: drawn on every quality). */
export function renderEliteMarkers(ctx: CanvasRenderingContext2D, enemies: EnemyState[]): void {
  let crown: HTMLCanvasElement | null | undefined;
  const pixel = !isLowQuality();
  for (const e of enemies) {
    if (!e.isElite || !e.alive || e.dying) continue;
    if (crown === undefined) crown = getIconSprite(UI_ICONS.crown, "#fbbf24", 18);
    if (!crown) return;
    const top = e.shape === "sprite" ? e.radius * 1.75 : pixel ? e.radius * ENEMY_SPRITE_PER_RADIUS * 0.5 + 4 : e.radius;
    drawSpriteCentered(ctx, crown, e.x, e.y - top - 16);
  }
}

/** Removes dead enemies and enemies that have wandered too far from the player in a single in-place pass. */
export function cullDead(enemies: EnemyState[]): EnemyState[] {
  let write = 0;
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (e.alive || e.dying) {
      if (write !== i) enemies[write] = e;
      write++;
    }
  }
  enemies.length = write;
  return enemies;
}

/** Lowest remaining elite timer, or null if none are alive. */
export function eliteSecondsLeft(enemies: EnemyState[]): number | null {
  let best: number | null = null;
  for (const e of enemies) {
    if (!e.isElite || !e.alive || e.dying) continue;
    const t = e.eliteLife ?? CONFIG.elite.killSeconds;
    if (best === null || t < best) best = t;
  }
  return best;
}

/** Counts down elite kill timers. True when one ran out while the elite was still alive. */
export function tickEliteLife(enemies: EnemyState[], dt: number): boolean {
  let expired = false;
  for (const e of enemies) {
    if (!e.isElite || !e.alive || e.dying) continue;
    e.eliteLife = (e.eliteLife ?? CONFIG.elite.killSeconds) - dt;
    if (e.eliteLife <= 0) expired = true;
  }
  return expired;
}

/** Removes enemies that have wandered too far from the player (off-screen cleanup), in-place. */
export function cullFarEnemies(enemies: EnemyState[], px: number, py: number): EnemyState[] {
  const maxDist2 = (CONFIG.canvasWidth * 1.5) * (CONFIG.canvasWidth * 1.5);
  let write = 0;
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (!e.alive && !e.dying) continue;
    // A living elite has to be killed. Running away does not clear the timer.
    if (e.isElite && e.alive) {
      if (write !== i) enemies[write] = e;
      write++;
      continue;
    }
    const dx = e.x - px;
    const dy = e.y - py;
    if (dx * dx + dy * dy < maxDist2) {
      if (write !== i) enemies[write] = e;
      write++;
    }
  }
  enemies.length = write;
  return enemies;
}
