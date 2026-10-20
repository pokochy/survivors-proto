// ============================================================
//  GemManager.ts — XP gem drops, magnet pickup, rendering
// ============================================================

import { CONFIG } from "@/game/data/config";
import type { EnemyState, Gem, PlayerState, SpecialPickup } from "@/game/core/types";
import { isLowQuality } from "@/game/render/quality";
import { getIconSprite, drawSpriteCentered } from "@/game/render/iconSprites";
import { UI_ICONS } from "@/assets/icons/map";
import { getPixelImage, drawStrip, drawShadow } from "@/game/render/pixel";
import { drawCentered } from "@/game/render/sprites";

function gemTierIndex(value: number): number {
  if (value >= 20) return 4;
  if (value >= 10) return 3;
  if (value >= 5) return 2;
  if (value >= 2) return 1;
  return 0;
}

/** High quality treasure chest. XP gems are drawn as spheres by the caller. */
function renderPixelChest(ctx: CanvasRenderingContext2D, g: Gem, now: number): boolean {
  const chest = getPixelImage("items/chest");
  if (!chest) return false;
  const pulse = 0.7 + Math.sin(now * 0.006) * 0.3;
  ctx.fillStyle = `rgba(251, 191, 36, ${pulse * 0.25})`;
  ctx.beginPath();
  ctx.arc(g.x, g.y, g.radius + 10, 0, Math.PI * 2);
  ctx.fill();
  drawShadow(ctx, g.x, g.y + 14, 3);
  drawStrip(ctx, "items/chest", 0, g.x, g.y, 2.5);
  return true;
}

let idCounter = 9000;

export function resetGemManager(): void {
  idCounter = 9000;
}

export function dropGem(enemy: EnemyState): Gem {
  return {
    id: ++idCounter,
    x: enemy.x + (Math.random() - 0.5) * 10,
    y: enemy.y + (Math.random() - 0.5) * 10,
    radius: CONFIG.gem.radius,
    value: 1,
    alive: true,
  };
}

export function dropTreasure(enemy: EnemyState): Gem {
  return {
    id: ++idCounter,
    x: enemy.x,
    y: enemy.y,
    radius: 12,
    value: 0,
    alive: true,
    isTreasure: true,
  };
}

const SPECIALS: SpecialPickup[] = ["magnet", "heart", "bomb"];

/** About 1/300 kills. The three kinds are equally likely. Null when the roll misses. */
export function rollSpecialDrop(enemy: EnemyState): Gem | null {
  if (Math.random() >= CONFIG.special.dropChance) return null;
  const pickup = SPECIALS[Math.floor(Math.random() * SPECIALS.length)];
  return {
    id: ++idCounter,
    x: enemy.x + (Math.random() - 0.5) * 18,
    y: enemy.y + (Math.random() - 0.5) * 18,
    radius: CONFIG.special.radius,
    value: 0,
    alive: true,
    pickup,
  };
}

/** Updates gems — magnet pull + collection. Returns { xp, treasure } separately. */
export interface GemUpdateResult {
  xp: number;
  treasure: boolean;
  magnet: boolean;
  heart: boolean;
  bomb: boolean;
}

export function updateGems(gems: Gem[], player: PlayerState, dt: number): GemUpdateResult {
  let collectedXp = 0;
  let treasure = false;
  let magnet = false;
  let heart = false;
  let bomb = false;

  for (const g of gems) {
    if (!g.alive) continue;

    if (g.pickup) {
      const pdx = player.x - g.x;
      const pdy = player.y - g.y;
      const pdist2 = pdx * pdx + pdy * pdy;
      const pickupR2 = player.pickupRadius * player.pickupRadius;
      if (pdist2 < pickupR2) {
        const dist = Math.sqrt(pdist2);
        if (dist > 0.1) {
          g.x += (pdx / dist) * CONFIG.gem.magnetSpeed * dt;
          g.y += (pdy / dist) * CONFIG.gem.magnetSpeed * dt;
        }
      }
      const collectR = player.radius + g.radius + 4;
      if (pdist2 < collectR * collectR) {
        g.alive = false;
        if (g.pickup === "magnet") magnet = true;
        else if (g.pickup === "heart") heart = true;
        else bomb = true;
      }
      continue;
    }

    if (g.isTreasure) {
      // Treasure has larger pickup radius
      const tdx = player.x - g.x;
      const tdy = player.y - g.y;
      const tdist2 = tdx * tdx + tdy * tdy;
      const pickupR2 = player.pickupRadius * player.pickupRadius;
      if (tdist2 < pickupR2) {
        const dist = Math.sqrt(tdist2);
        if (dist > 0.1) {
          g.x += (tdx / dist) * CONFIG.gem.magnetSpeed * dt;
          g.y += (tdy / dist) * CONFIG.gem.magnetSpeed * dt;
        }
      }
      const collectR = player.radius + g.radius + 5;
      if (tdist2 < collectR * collectR) {
        g.alive = false;
        treasure = true;
      }
      continue;
    }

    const dx = player.x - g.x;
    const dy = player.y - g.y;
    const dist2 = dx * dx + dy * dy;

    // Magnet pull. A magnet pickup marks the gem so it comes from anywhere on the map.
    const speed = g.attracted ? CONFIG.special.pullSpeed : CONFIG.gem.magnetSpeed;
    if (g.attracted || dist2 < player.pickupRadius * player.pickupRadius) {
      const dist = Math.sqrt(dist2);
      if (dist > 0.1) {
        g.x += (dx / dist) * speed * dt;
        g.y += (dy / dist) * speed * dt;
      }
    }

    // Collection
    const collectR = player.radius + g.radius;
    if (dist2 < collectR * collectR) {
      g.alive = false;
      collectedXp += g.value;
    }
  }

  return { xp: collectedXp, treasure, magnet, heart, bomb };
}

export function cullGems(gems: Gem[]): Gem[] {
  // In-place compaction: swap dead gems to end, then truncate
  let write = 0;
  for (let i = 0; i < gems.length; i++) {
    if (gems[i].alive) {
      if (write !== i) gems[write] = gems[i];
      write++;
    }
  }
  gems.length = write;
  return gems;
}

/**
 * Merges XP gems that are too far from the player into the nearest in-range gem,
 * adding their value. If no in-range gem exists, the far gem is teleported
 * to the edge of the range so it stays collectable.
 * Treasure chests are never merged; a far chest is only pulled to the edge.
 */
function pullToRangeEdge(g: Gem, px: number, py: number, maxDist: number): void {
  const dx = px - g.x;
  const dy = py - g.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist > 0.1) {
    g.x = px - (dx / dist) * maxDist;
    g.y = py - (dy / dist) * maxDist;
  }
}

export function mergeFarGems(gems: Gem[], px: number, py: number, maxDist: number): Gem[] {
  const maxDist2 = maxDist * maxDist;
  const inRange: Gem[] = [];
  const far: Gem[] = [];
  const treasures: Gem[] = [];
  for (const g of gems) {
    if (!g.alive) continue;
    // Chests and special pickups are not XP. Folding one into a gem would delete it.
    if (g.isTreasure || g.pickup) {
      const dx = g.x - px;
      const dy = g.y - py;
      if (dx * dx + dy * dy > maxDist2) pullToRangeEdge(g, px, py, maxDist);
      treasures.push(g);
      continue;
    }
    const dx = g.x - px;
    const dy = g.y - py;
    if (dx * dx + dy * dy > maxDist2) far.push(g);
    else inRange.push(g);
  }

  for (const f of far) {
    // Find nearest in-range gem to merge into
    let nearest: Gem | null = null;
    let nearestDist2 = Infinity;
    for (const ir of inRange) {
      const dx = ir.x - f.x;
      const dy = ir.y - f.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < nearestDist2) {
        nearestDist2 = d2;
        nearest = ir;
      }
    }
    if (nearest) {
      nearest.value += f.value;
      if (f.attracted) nearest.attracted = true;
      // Grow radius slightly to reflect merged value
      nearest.radius = Math.min(nearest.radius + 0.5, 10);
      f.alive = false;
    } else {
      // No in-range gem — pull the far gem to the edge of range toward the player
      pullToRangeEdge(f, px, py, maxDist);
      inRange.push(f);
    }
  }

  return inRange.concat(treasures);
}

/**
 * When the XP gem count exceeds a threshold, merges nearby gems together to keep
 * the field manageable. Each gem merges into the closest other gem within
 * `mergeRadius`, accumulating value and radius.
 * Treasure chests are left untouched, so an elite drop cannot vanish into a gem.
 */
export function consolidateGems(gems: Gem[], maxCount: number, mergeRadius: number): Gem[] {
  const treasures: Gem[] = [];
  const alive: Gem[] = [];
  for (const g of gems) {
    if (!g.alive) continue;
    if (g.isTreasure || g.pickup) treasures.push(g);
    else alive.push(g);
  }
  if (alive.length <= maxCount) return alive.concat(treasures);

  // Single-pass greedy merge: merge each gem into the nearest already-visited gem if within mergeRadius.
  const mergeR2 = mergeRadius * mergeRadius;
  const merged: Gem[] = [];
  for (const g of alive) {
    let best: Gem | null = null;
    let bestDist2 = mergeR2;
    for (const m of merged) {
      const dx = m.x - g.x;
      const dy = m.y - g.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestDist2) {
        bestDist2 = d2;
        best = m;
      }
    }
    if (best) {
      const total = best.value + g.value;
      if (total > 0) {
        best.x = (best.x * best.value + g.x * g.value) / total;
        best.y = (best.y * best.value + g.y * g.value) / total;
      }
      best.value = total;
      if (g.attracted) best.attracted = true;
      best.radius = Math.min(best.radius + 0.5, 12);
    } else {
      merged.push(g);
    }
  }

  // If still over cap (no close pairs left), force-merge excess into nearest neighbor
  while (merged.length > maxCount) {
    const last = merged.pop()!;
    if (merged.length === 0) {
      merged.push(last);
      break;
    }
    let nearestIdx = 0;
    let nearestDist2 = Infinity;
    for (let i = 0; i < merged.length; i++) {
      const dx = merged[i].x - last.x;
      const dy = merged[i].y - last.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < nearestDist2) {
        nearestDist2 = d2;
        nearestIdx = i;
      }
    }
    const target = merged[nearestIdx];
    const total = target.value + last.value;
    if (total > 0) {
      target.x = (target.x * target.value + last.x * last.value) / total;
      target.y = (target.y * target.value + last.y * last.value) / total;
    }
    target.value = total;
    if (last.attracted) target.attracted = true;
    target.radius = Math.min(target.radius + 0.5, 12);
  }

  return merged.concat(treasures);
}

// Baked once per size. Light sits up-left so the orb reads as a sphere, not a flat disc.
interface SphereTier {
  light: string;
  body: string;
  edge: string;
  radiusBonus: number;
}

const SPHERE_TIERS: SphereTier[] = [
  { light: "#f0f9ff", body: CONFIG.gem.color, edge: "#38bdf8", radiusBonus: 3 },    // value < 2, bright sky
  { light: "#e0f2fe", body: "#38bdf8", edge: "#0284c7", radiusBonus: 4.5 },         // 2–4
  { light: "#bae6fd", body: "#0ea5e9", edge: "#0369a1", radiusBonus: 6 },           // 5–9
  { light: "#7dd3fc", body: "#0284c7", edge: "#075985", radiusBonus: 7.5 },         // 10–19
  { light: "#38bdf8", body: "#0369a1", edge: "#0c4a6e", radiusBonus: 9 },           // 20+
];

const sphereCache = new Map<string, HTMLCanvasElement>();

function xpSphere(radius: number, tier: SphereTier): HTMLCanvasElement {
  const r = Math.max(1, Math.round(radius));
  const key = `${r}|${tier.body}`;
  const hit = sphereCache.get(key);
  if (hit) return hit;

  const cv = document.createElement("canvas");
  cv.width = r * 2;
  cv.height = r * 2;
  const g = cv.getContext("2d");
  if (g) {
    const grad = g.createRadialGradient(r * 0.38, r * 0.36, r * 0.08, r * 0.5, r * 0.52, r);
    grad.addColorStop(0, tier.light);
    grad.addColorStop(0.45, tier.body);
    grad.addColorStop(1, tier.edge);
    g.fillStyle = grad;
    g.beginPath();
    g.arc(r, r, r, 0, Math.PI * 2);
    g.fill();
  }
  sphereCache.set(key, cv);
  return cv;
}

const SPECIAL_LOOK = {
  magnet: { fill: "#7c3aed", ring: "#ede9fe", icon: "acc-magnetCharm", iconColor: "#f5f3ff" },
  heart: { fill: "#e11d48", ring: "#ffe4e6", icon: "", iconColor: "#fff1f2" },
  bomb: { fill: "#ea580c", ring: "#ffedd5", icon: "weapon-bomb", iconColor: "#fff7ed" },
} as const;

/** Opaque disc plus a light icon. Same look at both quality settings. */
function drawSpecial(ctx: CanvasRenderingContext2D, g: Gem): void {
  const look = SPECIAL_LOOK[g.pickup ?? "magnet"];
  ctx.fillStyle = look.fill;
  ctx.beginPath();
  ctx.arc(g.x, g.y, g.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = look.ring;
  ctx.lineWidth = 2;
  ctx.stroke();

  if (g.pickup === "heart") {
    drawHeart(ctx, g.x, g.y - 0.5, g.radius * 0.62);
    return;
  }
  const icon = getIconSprite(look.icon, look.iconColor, Math.round(g.radius * 1.55));
  if (icon) drawSpriteCentered(ctx, icon, g.x, g.y);
}

function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.fillStyle = "#fff1f2";
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.72);
  ctx.bezierCurveTo(x - s * 1.15, y + s * 0.15, x - s * 0.72, y - s * 0.85, x, y - s * 0.28);
  ctx.bezierCurveTo(x + s * 0.72, y - s * 0.85, x + s * 1.15, y + s * 0.15, x, y + s * 0.72);
  ctx.fill();
}

export function renderGems(ctx: CanvasRenderingContext2D, gems: Gem[]): void {
  const low = isLowQuality();
  const now = performance.now();
  const pulse = 0.7 + Math.sin(now * 0.006) * 0.3;
  for (const g of gems) {
    if (!g.alive) continue;

    if (g.pickup) {
      drawSpecial(ctx, g);
      continue;
    }

    if (g.isTreasure) {
      if (!low && renderPixelChest(ctx, g, now)) continue;

      ctx.fillStyle = `rgba(251, 191, 36, ${pulse * 0.3})`;
      ctx.beginPath();
      ctx.arc(g.x, g.y, g.radius + 8, 0, Math.PI * 2);
      ctx.fill();

      const chest = getIconSprite(UI_ICONS.treasure, "#fbbf24", Math.round(g.radius * 2.6));
      if (chest) {
        drawSpriteCentered(ctx, chest, g.x, g.y);
        continue;
      }
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath();
      ctx.arc(g.x, g.y, g.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#fde68a";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctx.beginPath();
      ctx.arc(g.x, g.y, g.radius * 0.35, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }

    const tier = SPHERE_TIERS[gemTierIndex(g.value)];
    const r = g.radius + tier.radiusBonus;
    drawCentered(ctx, xpSphere(r, tier), g.x, g.y, r);
  }
}
