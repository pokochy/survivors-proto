// ============================================================
//  render/pixel.ts — drawing helpers for the pixel-art sprites (src/assets/pixel).
//
//  Used only on high quality: low quality keeps the original shape/icon renderer.
//  Images load lazily on first use (no DOM at import → `npm run sim` works in Node);
//  every helper returns false while its image is still loading so the caller can
//  fall back to the old drawing for that frame.
//  Pixel art is drawn with image smoothing off (nearest neighbour) and restored after.
// ============================================================

import { pixelUrl } from "@/assets/pixel";
import { STRIP_FRAME_W, UNIT_DRAW_SCALE, UNIT_FRAME, UNIT_FRAME_PX, UNIT_FRAMES } from "@/assets/pixel/catalog";

const images = new Map<string, HTMLImageElement>();
const tinted = new Map<string, HTMLCanvasElement>();

/** Loaded image for a pixel asset name ("units/char-survivor"), or null while loading / in Node. */
export function getPixelImage(name: string): HTMLImageElement | null {
  if (typeof document === "undefined") return null;
  let img = images.get(name);
  if (!img) {
    const url = pixelUrl(name);
    if (!url) return null;
    img = new Image();
    img.decoding = "async";
    img.src = url;
    images.set(name, img);
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
}

export function preloadPixel(names: Iterable<string>): void {
  if (typeof document === "undefined") return;
  for (const n of names) getPixelImage(n);
}

/**
 * Copy of an image with `color` laid over its opaque pixels at `amount` (0–1).
 * Built once per (image, color, amount) — used for elite enemies.
 */
function getTinted(name: string, img: HTMLImageElement, color: string, amount: number): HTMLCanvasElement {
  const key = `${name}|${color}|${amount}`;
  const hit = tinted.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const g = c.getContext("2d");
  if (g) {
    g.drawImage(img, 0, 0);
    g.globalCompositeOperation = "source-atop";
    g.globalAlpha = amount;
    g.fillStyle = color;
    g.fillRect(0, 0, c.width, c.height);
  }
  tinted.set(key, c);
  return c;
}

/** Facing column (0 down, 1 up, 2 left, 3 right) for a movement / look vector. */
export function facingFromVector(dx: number, dy: number, prev = 0): number {
  if (dx === 0 && dy === 0) return prev;
  if (Math.abs(dx) >= Math.abs(dy)) return dx < 0 ? 2 : 3;
  return dy < 0 ? 1 : 0;
}

/** Soft oval shadow under a unit (16px source scaled with the unit). */
export function drawShadow(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number): void {
  const img = getPixelImage("units/shadow");
  if (!img) return;
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, x - w / 2, y - h / 2, w, h);
  ctx.imageSmoothingEnabled = true;
}

export interface UnitDrawOptions {
  /** Overlay color for elites etc. */
  tint?: string;
  tintAmount?: number;
  shadow?: boolean;
}

/**
 * Draw one frame of a 4×4 unit sheet centered on (x, y).
 * @param facing column (see facingFromVector) @param frame walk frame (any integer)
 * @returns false while the sheet is loading
 */
export function drawUnit(
  ctx: CanvasRenderingContext2D,
  sheet: string,
  facing: number,
  frame: number,
  x: number,
  y: number,
  scale: number,
  opts?: UnitDrawOptions,
): boolean {
  const img = getPixelImage(sheet);
  if (!img) return false;
  const src = opts?.tint ? getTinted(sheet, img, opts.tint, opts.tintAmount ?? 0.35) : img;
  const framePx = UNIT_FRAME_PX[sheet] ?? UNIT_FRAME;
  const s = UNIT_FRAME * scale * (UNIT_DRAW_SCALE[sheet] ?? 1);
  if (opts?.shadow !== false) drawShadow(ctx, x, y + s * 0.42, scale);
  const row = ((frame % UNIT_FRAMES) + UNIT_FRAMES) % UNIT_FRAMES;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, facing * framePx, row * framePx, framePx, framePx, Math.round(x - s / 2), Math.round(y - s / 2), s, s);
  ctx.imageSmoothingEnabled = true;
  return true;
}

/** Number of frames in a horizontal strip (1 until the image has loaded). */
export function stripFrameCount(name: string): number {
  const img = getPixelImage(name);
  if (!img) return 1;
  const fw = STRIP_FRAME_W[name] ?? img.naturalWidth;
  return Math.max(1, Math.floor(img.naturalWidth / fw));
}

/**
 * Draw frame `frame` (wraps around) of a horizontal strip centered on (x, y).
 * @param scale source px → world px @param angle rotation in radians
 * @returns false while the image is loading
 */
export function drawStrip(
  ctx: CanvasRenderingContext2D,
  name: string,
  frame: number,
  x: number,
  y: number,
  scale: number,
  angle = 0,
): boolean {
  const img = getPixelImage(name);
  if (!img) return false;
  const fw = STRIP_FRAME_W[name] ?? img.naturalWidth;
  const fh = img.naturalHeight;
  const n = Math.max(1, Math.floor(img.naturalWidth / fw));
  const f = ((Math.floor(frame) % n) + n) % n;
  const w = fw * scale;
  const h = fh * scale;
  ctx.imageSmoothingEnabled = false;
  if (angle === 0) {
    ctx.drawImage(img, f * fw, 0, fw, fh, x - w / 2, y - h / 2, w, h);
  } else {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.drawImage(img, f * fw, 0, fw, fh, -w / 2, -h / 2, w, h);
    ctx.restore();
  }
  ctx.imageSmoothingEnabled = true;
  return true;
}

/** Same as drawStrip, with a cached color laid over the opaque pixels. */
export function drawTintedStrip(
  ctx: CanvasRenderingContext2D,
  name: string,
  frame: number,
  x: number,
  y: number,
  scale: number,
  angle: number,
  color: string,
  amount: number,
): boolean {
  const img = getPixelImage(name);
  if (!img) return false;
  const src = getTinted(name, img, color, amount);
  const fw = STRIP_FRAME_W[name] ?? img.naturalWidth;
  const fh = img.naturalHeight;
  const n = Math.max(1, Math.floor(img.naturalWidth / fw));
  const f = ((Math.floor(frame) % n) + n) % n;
  const w = fw * scale;
  const h = fh * scale;
  ctx.imageSmoothingEnabled = false;
  if (angle === 0) {
    ctx.drawImage(src, f * fw, 0, fw, fh, x - w / 2, y - h / 2, w, h);
  } else {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.drawImage(src, f * fw, 0, fw, fh, -w / 2, -h / 2, w, h);
    ctx.restore();
  }
  ctx.imageSmoothingEnabled = true;
  return true;
}

/** Draw a rectangle of 16px tiles (c, r, w, h in tile units) from a tile sheet at world (x, y). */
export function drawTiles(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  c: number,
  r: number,
  w: number,
  h: number,
  x: number,
  y: number,
  scale = 1,
): void {
  ctx.drawImage(img, c * 16, r * 16, w * 16, h * 16, x, y, w * 16 * scale, h * 16 * scale);
}
