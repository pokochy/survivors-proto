// ============================================================
//  scripts/sync-pixel-assets.mjs — copy the pixel-art files the game uses
//  from the source packs in art/ into src/assets/pixel/ (bundled by Vite).
//
//  Only files listed here are shipped, so the exe stays small even though
//  art/ holds the full packs. To use a new sprite: add a line, run
//  `npm run assets:pixel`, then reference it by its short name
//  (see src/assets/pixel/catalog.ts).
// ============================================================

import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const NA = "art/ninja-adventure";
const CH = `${NA}/Actor/Characters`;
const MO = `${NA}/Actor/Monsters`;

/** [destination under src/assets/pixel, source under the repo root] */
const FILES = [
  // ---- Playable characters: 4×4 walk sheet (cols = down/up/left/right, rows = frames) + 38×38 face
  ...[
    ["survivor", "NinjaBlue"],
    ["berserker", "FighterWhite"],
    ["guardian", "Knight"],
    ["scout", "NinjaGreen"],
    ["mage", "NinjaMageBlack"],
  ].flatMap(([id, src]) => [
    [`units/char-${id}.png`, `${CH}/${src}/SeparateAnim/Walk.png`],
    [`faces/char-${id}.png`, `${CH}/${src}/Faceset.png`],
  ]),
  // Linya is a cat beastkin composited from Universal LPC (see art/linya/README.md).
  // 32×32 frames, not the 16×16 Ninja Adventure sheet.
  ["units/char-linya.png", "art/linya/char-linya-walk.png"],
  ["faces/char-linya.png", "art/linya/char-linya-face.png"],
  // Euroan is a red-haired man composited from Universal LPC (see art/euroan/README.md).
  ["units/char-euroan.png", "art/euroan/char-euroan-walk.png"],
  ["faces/char-euroan.png", "art/euroan/char-euroan-face.png"],

  // ---- Enemies: same 4×4 layout (wolf keeps its original public/assets/enemy/Wolf.png)
  ...[
    ["slime", `${MO}/Slime/Slime.png`, `${MO}/Slime/Faceset.png`],
    ["bat", `${MO}/Butterfly/SpriteSheet.png`, `${MO}/Butterfly/Faceset.png`],
    ["skeleton", `${CH}/Skeleton/SeparateAnim/Walk.png`, `${CH}/Skeleton/Faceset.png`],
    ["ghost", `${MO}/Spirit/SpriteSheet.png`, `${MO}/Spirit/Faceset.png`],
    ["brute", `${MO}/Beast/Beast.png`, `${MO}/Beast/Faceset.png`],
    ["wraith", `${MO}/Flam/SpriteSheet.png`, `${MO}/Flam/Faceset.png`],
  ].flatMap(([id, sheet, face]) => [
    [`units/enemy-${id}.png`, sheet],
    [`faces/enemy-${id}.png`, face],
  ]),
  ["units/shadow.png", `${CH}/Shadow.png`],

  // ---- World tiles (16px grid)
  ["tiles/floor.png", `${NA}/Backgrounds/Tilesets/TilesetFloor.png`],
  ["tiles/nature.png", `${NA}/Backgrounds/Tilesets/TilesetNature.png`],
  ["tiles/detail.png", `${NA}/Backgrounds/Tilesets/TilesetFloorDetail.png`],

  // ---- Projectiles (horizontal frame strips)
  ["proj/kunai.png", `${NA}/FX/Projectile/Kunai.png`],
  ["proj/big-kunai.png", `${NA}/FX/Projectile/BigKunai.png`],
  ["proj/shuriken.png", `${NA}/FX/Projectile/Shuriken.png`],
  ["proj/shuriken-magic.png", `${NA}/FX/Projectile/ShurikenMagic.png`],
  ["proj/big-shuriken.png", `${NA}/FX/Projectile/BigShuriken.png`],
  ["proj/energy-ball.png", `${NA}/FX/Projectile/EnergyBall.png`],
  ["proj/big-energy-ball.png", `${NA}/FX/Projectile/BigEnergyBall.png`],
  ["proj/fireball.png", `${NA}/FX/Projectile/Fireball.png`],
  ["proj/canonball.png", `${NA}/FX/Projectile/CanonBall.png`],

  // ---- Animated effects (horizontal frame strips)
  ["fx/claw.png", `${NA}/FX/SlashFx/Claw/SpriteSheet.png`],
  ["fx/claw-double.png", `${NA}/FX/SlashFx/ClawDouble/SpriteSheet.png`],
  ["fx/slash-circular.png", `${NA}/FX/SlashFx/CircularSlash/SpriteSheet.png`],
  ["fx/slash-curved.png", `${NA}/FX/SlashFx/SlashCurved/SpriteSheet.png`],
  ["fx/circle-orange.png", `${NA}/FX/Magic/Circle/SpriteSheetOrange.png`],
  ["fx/circle-white.png", `${NA}/FX/Magic/Circle/SpriteSheetWhite.png`],
  ["fx/circle-spark.png", `${NA}/FX/Magic/Circle/SpriteSheetSpark.png`],
  ["fx/spark.png", `${NA}/FX/Magic/Spark/SpriteSheet.png`],
  ["fx/aura.png", `${NA}/FX/Magic/Aura/SpriteSheetWhite.png`],
  ["fx/smoke.png", `${NA}/FX/Smoke/Smoke/SpriteSheet.png`],
  ["fx/flam.png", `${NA}/FX/Elemental/Flam/SpriteSheet.png`],
  ["fx/thunder.png", `${NA}/FX/Elemental/Thunder/SpriteSheet.png`],
  ["fx/rock.png", `${NA}/FX/Elemental/Rock/SpriteSheet.png`],
  ["fx/fire.png", `${NA}/FX/Particle/Fire.png`],

  // ---- Items
  ["items/chest.png", `${NA}/Items/Treasure/LittleTreasureChest.png`],
  ["items/chest-big.png", `${NA}/Items/Treasure/BigTreasureChest.png`],
  ["items/coin.png", `${NA}/Items/Treasure/Coin2.png`],
  ["items/sword.png", `${NA}/Items/Weapons/Sword/Sprite.png`],
  ["items/katana.png", `${NA}/Items/Weapons/Katana/Sprite.png`],
  ["items/big-sword.png", `${NA}/Items/Weapons/BigSword/Sprite.png`],
];

const outDir = join(root, "src/assets/pixel");
let copied = 0;
for (const [dest, src] of FILES) {
  const from = join(root, src);
  if (!existsSync(from)) {
    console.error(`missing source: ${src}`);
    process.exitCode = 1;
    continue;
  }
  const to = join(outDir, dest);
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
  copied++;
}
console.log(`pixel assets: ${copied}/${FILES.length} copied → src/assets/pixel/`);
