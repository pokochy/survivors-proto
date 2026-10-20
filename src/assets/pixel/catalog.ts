// ============================================================
//  assets/pixel/catalog.ts — what each pixel-art file is and how it is sliced.
//
//  Unit sheets (units/*): 4 columns × 4 rows. Default frame is 16×16 (64×64 sheet).
//    column = facing (0 down, 1 up, 2 left, 3 right), row = walk frame.
//    Linya and Euroan are 32×32 LPC frames (see UNIT_FRAME_PX).
//  Faces (faces/*): 38×38 portrait used by the UI.
//  Strips (proj/*, fx/*, items/*): frames laid out horizontally; the frame width
//    is listed below and the frame height is the image height.
//  Tiles (tiles/*): 16×16 grid, coordinates are picked in game/render/tileWorld.ts.
// ============================================================

export const UNIT_FRAME = 16;
export const UNIT_FRAMES = 4;

/**
 * Source frame size for sheets that are not 16×16.
 * On-screen height still tracks the 16px cast — see UNIT_DRAW_SCALE.
 */
export const UNIT_FRAME_PX: Record<string, number> = {
  "units/char-linya": 32,
  "units/char-euroan": 32,
};

/**
 * Extra draw scale. LPC frames have empty padding, so 1× would make them
 * shorter than the 16px characters. 1.2 matches their on-screen height.
 */
export const UNIT_DRAW_SCALE: Record<string, number> = {
  "units/char-linya": 1.2,
  "units/char-euroan": 1.2,
};

/** Facing column in a unit sheet. */
export const FACING = { down: 0, up: 1, left: 2, right: 3 } as const;

/** Frame width (px) of every horizontal strip. Single images use their own width. */
export const STRIP_FRAME_W: Record<string, number> = {
  "proj/kunai": 14,
  "proj/big-kunai": 35,
  "proj/shuriken": 16,
  "proj/shuriken-magic": 16,
  "proj/big-shuriken": 23,
  "proj/energy-ball": 16,
  "proj/big-energy-ball": 24,
  "proj/fireball": 16,
  "proj/canonball": 16,
  "fx/claw": 32,
  "fx/claw-double": 32,
  "fx/slash-circular": 32,
  "fx/slash-curved": 32,
  "fx/circle-orange": 32,
  "fx/circle-white": 32,
  "fx/circle-spark": 32,
  "fx/spark": 32,
  "fx/aura": 32,
  "fx/smoke": 32,
  "fx/flam": 32,
  "fx/thunder": 20,
  "fx/rock": 30,
  "fx/fire": 12,
  "items/chest": 16,
  "items/chest-big": 16,
  "items/coin": 10,
  "items/sword": 6,
  "items/katana": 6,
  "items/big-sword": 7,
};

/** Walk sheet of a playable character (every character in progression.ts has one). */
export function characterSheet(id: string): string {
  return `units/char-${id}`;
}

/** 38×38 portrait of a playable character. */
export function characterFace(id: string): string {
  return `faces/char-${id}`;
}

/** Walk sheet of an enemy type, or null when it uses its own renderer (wolf). */
export function enemySheet(id: string): string | null {
  return id === "wolf" ? null : `units/enemy-${id}`;
}

/** 38×38 portrait of an enemy type, or null if there is none. */
export function enemyFace(id: string): string | null {
  return id === "wolf" ? null : `faces/enemy-${id}`;
}
