// ============================================================
//  Player.ts — Movement, rendering, XP & leveling
// ============================================================

import { CONFIG, xpForLevel } from "@/game/data/config";
import type { PlayerState } from "@/game/core/types";
import { isLowQuality } from "@/game/render/quality";
import { getIconSprite, drawSpriteCentered } from "@/game/render/iconSprites";
import { drawUnit, facingFromVector } from "@/game/render/pixel";

/** Source px → world px for the player's 16px walk sheet. */
const PLAYER_SPRITE_SCALE = 2.25;
const WALK_FPS = 8;

let idCounter = 0;

export function createPlayer(mods?: {
  hpMult?: number;
  speedMult?: number;
  pickupRangeMult?: number;
  playerColor?: string;
  emblem?: string;
  sprite?: string;
}): PlayerState {
  const hpMult = mods?.hpMult ?? 1;
  const speedMult = mods?.speedMult ?? 1;
  const pickupMult = mods?.pickupRangeMult ?? 1;
  const maxHp = Math.round(CONFIG.player.maxHp * hpMult);

  return {
    id: ++idCounter,
    x: CONFIG.player.startX,
    y: CONFIG.player.startY,
    radius: CONFIG.player.radius,
    hp: maxHp,
    maxHp,
    alive: true,
    speed: CONFIG.player.speed * speedMult,
    level: 1,
    xp: 0,
    xpToNext: xpForLevel(1),
    invulnTimer: 0,
    pickupRadius: CONFIG.player.pickupRadius * pickupMult,
    color: mods?.playerColor ?? CONFIG.player.color,
    emblem: mods?.emblem,
    sprite: mods?.sprite,
    facing: 0,
    aim: Math.PI / 2,
    walkTime: 0,
    moving: false,
  };
}

/** Moves player based on input bitmask. No canvas bounds — world is infinite. */
export function updatePlayer(
  player: PlayerState,
  input: { up: boolean; down: boolean; left: boolean; right: boolean },
  dt: number
): void {
  let dx = 0;
  let dy = 0;
  if (input.up) dy -= 1;
  if (input.down) dy += 1;
  if (input.left) dx -= 1;
  if (input.right) dx += 1;

  const len = Math.hypot(dx, dy);
  if (len > 0) {
    dx /= len;
    dy /= len;
  }

  player.x += dx * player.speed * dt;
  player.y += dy * player.speed * dt;

  // Walk animation state (render only)
  player.moving = len > 0;
  if (player.moving) {
    player.facing = facingFromVector(dx, dy, player.facing);
    player.aim = Math.atan2(dy, dx);
    player.walkTime += dt;
  }

  if (player.invulnTimer > 0) {
    player.invulnTimer -= dt;
  }
}

/** Adds XP and returns how many levels were gained (a big merged gem can give several). */
export function gainXp(player: PlayerState, amount: number): number {
  if (!player.alive) return 0;
  player.xp += amount;
  let levels = 0;
  while (player.xp >= player.xpToNext) {
    player.xp -= player.xpToNext;
    player.level++;
    player.xpToNext = xpForLevel(player.level);
    levels++;
  }
  return levels;
}

export function damagePlayer(player: PlayerState, dmg: number): void {
  if (player.invulnTimer > 0 || !player.alive) return;
  player.hp -= dmg;
  player.invulnTimer = CONFIG.player.invulnTime;
  if (player.hp <= 0) {
    player.hp = 0;
    player.alive = false;
  }
}

/** Dark ink on bright circles, light ink on dark ones (e.g. Linya's near-black color). */
function emblemInk(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return "#0a0a12";
  const n = parseInt(m[1], 16);
  const lum = (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
  return lum < 0.45 ? "#e2e8f0" : "#0a0a12";
}

export function renderPlayer(ctx: CanvasRenderingContext2D, player: PlayerState): void {
  const blinking = player.invulnTimer > 0 && Math.floor(player.invulnTimer * 10) % 2 === 0;

  // High quality: the character's own pixel sprite (falls through to the circle while loading)
  if (!isLowQuality() && player.sprite) {
    const frame = player.moving ? Math.floor(player.walkTime * WALK_FPS) : 0;
    // i-frames: classic blink (skip every other 0.1s) instead of a translucent body
    const drawn = blinking || drawUnit(ctx, player.sprite, player.facing, frame, player.x, player.y - 4, PLAYER_SPRITE_SCALE);
    if (drawn) {
      ctx.strokeStyle = "rgba(255,255,255,0.10)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.pickupRadius, 0, Math.PI * 2);
      ctx.stroke();
      return;
    }
  }

  const bodyColor = blinking ? "#67e8f9" : player.color;
  ctx.fillStyle = bodyColor;

  // Body
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fill();

  // Outline
  ctx.strokeStyle = "#0e7490";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Character emblem (pre-tinted sprite, one drawImage)
  if (player.emblem) {
    const ink = emblemInk(bodyColor);
    const sprite = getIconSprite(player.emblem, ink, Math.round(player.radius * 1.3), ink === "#0a0a12" ? bodyColor : "#0a0a12");
    if (sprite) drawSpriteCentered(ctx, sprite, player.x, player.y);
  }

  // Pickup radius indicator (subtle decoration)
  if (isLowQuality()) return;
  ctx.strokeStyle = "rgba(34,211,238,0.08)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.pickupRadius, 0, Math.PI * 2);
  ctx.stroke();
}
