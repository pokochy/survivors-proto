#!/usr/bin/env node
// ============================================================
//  scripts/sim.mjs — headless gameplay regression test
//
//    npm run sim                 # all characters, 6 game-minutes each
//    npm run sim -- --minutes 2  # shorter
//
//  Loads the real GameEngine through Vite SSR (no browser) and fast-forwards
//  update() with an auto-picking, invulnerable pilot. Fails (exit 1) on:
//    - exceptions, NaN positions/HP, entity counts above their caps
//    - a level-up pause with no options (soft-lock)
//    - level-up queue miscount (multi-level gem + treasure in one frame)
//    - evolved weapons not keeping their max level
//  Rendering is not exercised here (needs a real canvas) — check visuals in the browser.
// ============================================================

import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argMinutes = process.argv.indexOf("--minutes");
const MINUTES = argMinutes > 0 ? Number(process.argv[argMinutes + 1]) || 6 : 6;
const DT = 1 / 60;

const server = await createServer({
  root,
  logLevel: "error",
  appType: "custom",
  server: { middlewareMode: true, hmr: false },
});

const failures = [];
const fail = (msg) => failures.push(msg);

try {
  const { GameEngine } = await server.ssrLoadModule("/src/game/core/GameEngine.ts");
  const { CHARACTERS } = await server.ssrLoadModule("/src/game/data/progression.ts");
  const { CONFIG, enemyCap, eliteHp, regularSpawnInterval } = await server.ssrLoadModule("/src/game/data/config.ts");
  const atOneMinute = 0.8 * 0.98 ** 60;
  if (
    Math.abs(regularSpawnInterval(0) - 0.8) > 1e-9 ||
    Math.abs(regularSpawnInterval(60) - atOneMinute) > 1e-9 ||
    Math.abs(regularSpawnInterval(120) - atOneMinute * 0.75) > 1e-9
  ) {
    fail(`spawn interval ${regularSpawnInterval(0)}/${regularSpawnInterval(60)}/${regularSpawnInterval(120)}`);
  }
  if (enemyCap(0) !== 120 || enemyCap(60) !== 240 || enemyCap(120) !== 360 || enemyCap(30) !== 180) {
    fail(`enemy cap curve ${enemyCap(0)}/${enemyCap(30)}/${enemyCap(60)}/${enemyCap(120)}`);
  }
  if (enemyCap(0, 2) !== 240) fail(`enemy cap x2 ${enemyCap(0, 2)}`);
  if (eliteHp(0) !== 500 || eliteHp(60) !== 1000 || eliteHp(120) !== 2000) {
    fail(`elite hp ${eliteHp(0)}/${eliteHp(60)}/${eliteHp(120)}`);
  }
  const { constraintScore, constraintGoldMultiplier, resolveRunConstraints } = await server.ssrLoadModule("/src/game/data/constraints.ts");
  if (constraintScore(undefined) !== 0 || constraintGoldMultiplier(0) !== 1 || constraintGoldMultiplier(30) !== 1.3) {
    fail("constraint score/gold");
  }
  const mods = resolveRunConstraints({ enemyHp: 2, spawnRate: 3, playerDamage: 1, hpGrowth: 3 });
  if (mods.enemyHp !== 2 || mods.spawnInterval !== 0.5 || mods.playerDamage !== 0.8 || mods.xp !== 1 || mods.hpGrowth !== 2) {
    fail(`constraint mods ${JSON.stringify(mods)}`);
  }
  if (mods.enemyCount !== undefined) fail("enemy count constraint should be gone");

  const ctxStub = {}; // update() never touches the canvas
  const makeSave = (id, bt = 4) => ({
    schemaVersion: 2,
    gold: 0,
    owned: CHARACTERS.map((c) => ({ id: c.id, level: 10, stars: 5, memories: 0, breakthrough: bt })),
    traitLevels: { reroll: 3 },
    selectedCharacter: id,
    stars: 0,
    completedAchievements: [],
  });

  // ---------------------------------------------------------------- 1. long runs
  const rows = [];
  for (const ch of CHARACTERS) {
    let pick = null;
    let levelups = 0;
    const evolved = [];
    const engine = new GameEngine(ctxStub, {
      onStatsUpdate() {},
      onLevelUp(opts) {
        levelups++;
        if (!opts.length) fail(`${ch.id}: onLevelUp with 0 options`);
        pick =
          opts.find((o) => o.kind === "weaponEvolve") ??
          opts.find((o) => o.kind === "weaponLevel") ??
          opts.find((o) => o.kind === "newAccessory") ??
          opts[0];
      },
      onGameOver() {},
    }, makeSave(ch.id));
    const P = () => engine.player;
    let maxEnemies = 0;
    let maxGems = 0;
    let maxChests = 0;
    try {
      const steps = Math.round(MINUTES * 60 / DT);
      for (let i = 0; i < steps; i++) {
        P().hp = P().maxHp; // invulnerable pilot
        // steady level-ups (one gem worth a full level dropped at the pilot's feet every 1.5s)
        if (i % 90 === 0) engine.gems.push({ id: 1e6 + i, x: P().x, y: P().y, radius: 7, value: P().xpToNext, alive: true });
        if (engine.paused) {
          if (!pick) throw new Error("paused with no pending pick (soft-lock)");
          const o = pick;
          pick = null;
          if (o.kind === "weaponEvolve") evolved.push(o.weaponType);
          engine.applyUpgrade(o);
          continue;
        }
        engine.update(DT);
        if (i % 60 === 0) {
          maxEnemies = Math.max(maxEnemies, engine.enemies.length);
          let xp = 0;
          let chests = 0;
          for (const g of engine.gems) {
            if (g.isTreasure) chests++;
            else if (!g.pickup) xp++;
          }
          maxGems = Math.max(maxGems, xp);
          maxChests = Math.max(maxChests, chests);
          if (!Number.isFinite(P().x + P().y)) throw new Error("player position NaN");
          for (const e of engine.enemies) {
            if (!Number.isFinite(e.x + e.y + e.hp)) throw new Error(`enemy NaN (${e.enemyType})`);
          }
          for (const g of engine.gems) if (!Number.isFinite(g.value)) throw new Error("gem value NaN");
        }
      }
    } catch (err) {
      fail(`${ch.id}: ${err && err.stack ? err.stack.split("\n").slice(0, 2).join(" | ") : err}`);
    }
    // Regular spawns stop at the time-scaled cap; elites (1/min) may exceed it slightly.
    const spawnCap = enemyCap(MINUTES * 60) + Math.ceil(MINUTES) + 1;
    if (maxEnemies > spawnCap) fail(`${ch.id}: ${maxEnemies} enemies > cap ${spawnCap}`);
    // XP gems consolidate at 40; +1 covers a spawn before the next merge.
    // Chests are excluded from that merge, so they are capped on their own.
    if (maxGems > 41) fail(`${ch.id}: ${maxGems} xp gems > 41`);
    if (maxChests > 8) fail(`${ch.id}: ${maxChests} chests > 8`);
    for (const w of engine.weaponMgr.weapons) {
      if (w.evolved && w.level !== CONFIG.weapons[w.type].maxLevel) fail(`${ch.id}: evolved ${w.type} level ${w.level}`);
    }
    const st = engine.getStats();
    rows.push({
      char: ch.id,
      lv: st.level,
      kills: st.kills,
      levelups,
      evolved: evolved.join(",") || "-",
      weapons: st.weapons.map((w) => `${w.type}${w.evolved ? "*" : w.level}`).join(" "),
      maxEnemies,
      maxGems,
      maxChests,
    });
    engine.stop();
  }
  console.table(rows);

  // ---------------------------------------------------------------- 2. level-up queue
  {
    let opens = 0;
    let last = null;
    const engine = new GameEngine(ctxStub, { onStatsUpdate() {}, onLevelUp(o) { opens++; last = o; }, onGameOver() {} }, makeSave("survivor", 0));
    const P = engine.player;
    const before = P.level;
    engine.gems.push(
      { id: 1, x: P.x, y: P.y, radius: 7, value: 40, alive: true },
      { id: 2, x: P.x, y: P.y, radius: 12, value: 0, alive: true, isTreasure: true },
    );
    engine.update(DT);
    const expected = P.level - before + 1;
    let picks = 0;
    while (engine.paused && picks < 100) {
      engine.applyUpgrade(last[0]);
      picks++;
    }
    console.log(`queue: levels+treasure=${expected} picks, modal opened ${opens}x, picks made ${picks}`);
    if (opens !== expected || picks !== expected || engine.paused) fail(`level-up queue: expected ${expected}, opened ${opens}, picked ${picks}`);
    engine.stop();
  }

  // ---------------------------------------------------------------- 2b. treasure chests must survive gem merging
  {
    const { consolidateGems, mergeFarGems } = await server.ssrLoadModule("/src/game/entities/GemManager.ts");
    const chest = (x, y) => ({ id: 1, x, y, radius: 12, value: 0, alive: true, isTreasure: true });
    const gem = (id, x) => ({ id, x, y: 0, radius: 7, value: 1, alive: true });
    const crowded = [];
    for (let i = 0; i < 45; i++) crowded.push(gem(10 + i, (i % 5) * 20));
    crowded.push(chest(10, 0));
    const consolidated = consolidateGems(crowded, 40, 80);
    const chestsAfterCrowd = consolidated.filter((g) => g.isTreasure);
    if (chestsAfterCrowd.length !== 1 || !Number.isFinite(chestsAfterCrowd[0].x)) {
      fail(`chest lost in consolidate: ${chestsAfterCrowd.length}`);
    }
    const farChest = chest(5000, 0);
    const pulled = mergeFarGems([farChest, gem(2, 10)], 0, 0, 1152);
    const chestsAfterPull = pulled.filter((g) => g.isTreasure);
    if (chestsAfterPull.length !== 1 || !chestsAfterPull[0].alive || Math.hypot(chestsAfterPull[0].x, chestsAfterPull[0].y) > 1152 + 1) {
      fail("far chest was merged into an XP gem");
    }
  }

  // ---------------------------------------------------------------- 3. exhausted options must not soft-lock
  {
    let opens = 0;
    const engine = new GameEngine(ctxStub, { onStatsUpdate() {}, onLevelUp() { opens++; }, onGameOver() {} }, makeSave("survivor", 0));
    const wm = engine.weaponMgr;
    const am = engine.accessoryMgr;
    for (const t of ["melee", "bomb", "trap", "aura", "shuriken"]) wm.addWeapon(t);
    for (const w of wm.weapons) for (let i = 0; i < 8; i++) wm.levelUpWeapon(w.type);
    am.reset();
    for (const a of ["powerAmulet", "swiftBoots", "thornArmor", "shieldForge", "natureBlessing"]) {
      am.addAccessory(a);
      for (let i = 0; i < 5; i++) am.levelUpAccessory(a);
    }
    wm.evolveWeapon("bullet");
    wm.evolveWeapon("melee");
    engine.player.xp += engine.player.xpToNext * 3;
    engine.update(DT);
    console.log(`exhausted pool: modal opened ${opens}x, paused=${engine.paused}`);
    if (opens !== 0 || engine.paused) fail("exhausted upgrade pool soft-locks the game");
    engine.stop();
  }

  // ---------------------------------------------------------------- 4. special pickups
  {
    const { rollSpecialDrop, consolidateGems } = await server.ssrLoadModule("/src/game/entities/GemManager.ts");
    const prevChance = CONFIG.special.dropChance;
    CONFIG.special.dropChance = 1;
    const kinds = new Set();
    for (let i = 0; i < 90; i++) kinds.add(rollSpecialDrop({ x: 0, y: 0 }).pickup);
    CONFIG.special.dropChance = 0;
    if (rollSpecialDrop({ x: 0, y: 0 })) fail("special drop fired at chance 0");
    CONFIG.special.dropChance = prevChance;
    if (kinds.size !== 3) fail(`special kinds ${[...kinds].join(",")}`);

    const enemy = (x, y) => ({
      id: x, x, y, radius: 12, hp: 30, maxHp: 30, alive: true,
      speed: 0, baseSpeed: 0, damage: 0, contactTimer: 9,
      enemyType: "bat", color: "#fff", borderColor: "#fff", shape: "circle",
      spriteFrame: 0, spriteTimer: 0, facingRight: true, dying: false, dyingTimer: 0,
      isElite: false, gemDropped: false, facing: 0,
    });
    const engine = new GameEngine(ctxStub, { onStatsUpdate() {}, onLevelUp() {}, onGameOver() {} }, makeSave("survivor", 0));
    engine.player.hp = 1;
    for (const w of engine.weaponMgr.weapons) w.cooldownTimer = 999;
    const near = enemy(engine.player.x + 80, engine.player.y);
    const far = enemy(engine.player.x + 700, engine.player.y);
    engine.enemies.push(near, far);
    const px = engine.player.x;
    const py = engine.player.y;
    engine.gems.push(
      { id: 1, x: px, y: py, radius: 11, value: 0, alive: true, pickup: "heart" },
      { id: 2, x: px, y: py, radius: 11, value: 0, alive: true, pickup: "magnet" },
      { id: 3, x: px, y: py, radius: 11, value: 0, alive: true, pickup: "bomb" },
      { id: 4, x: px + 900, y: py, radius: 7, value: 1, alive: true },
    );
    const killsBefore = engine.kills;
    engine.update(DT);
    const orb = engine.gems.find((g) => g.id === 4);
    if (engine.player.hp !== engine.player.maxHp) fail(`heart left hp at ${engine.player.hp}`);
    if (!orb || !orb.attracted) fail("magnet did not mark the far XP gem");
    if (near.alive || !near.gemDropped) fail("bomb left the on-screen enemy alive");
    if (!far.alive) fail("bomb killed an enemy outside the screen");
    if (engine.kills !== killsBefore + 1) fail(`bomb kill count ${engine.kills - killsBefore}`);
    const x0 = orb.x;
    engine.update(DT);
    if (!(orb.x < x0 - 1)) fail("attracted gem did not move toward the player");
    const kept = consolidateGems([
      { id: 9, x: 0, y: 0, radius: 11, value: 0, alive: true, pickup: "bomb" },
      { id: 10, x: 5, y: 0, radius: 7, value: 1, alive: true },
    ], 1, 500);
    if (!kept.some((g) => g.pickup === "bomb" && g.alive)) fail("special pickup was merged into an XP gem");
    engine.stop();
  }

  // ---------------------------------------------------------------- 5. elite kill timer
  {
    let overs = 0;
    const engine = new GameEngine(ctxStub, { onStatsUpdate() {}, onLevelUp() {}, onGameOver() { overs++; } }, makeSave("survivor", 0));
    for (const w of engine.weaponMgr.weapons) w.cooldownTimer = 999;
    engine.player.hp = engine.player.maxHp;
    engine.enemies.push({
      id: 7, x: engine.player.x + 200, y: engine.player.y, radius: 12, hp: 99999, maxHp: 99999, alive: true,
      speed: 0, baseSpeed: 0, damage: 0, contactTimer: 9,
      enemyType: "slime", color: "#fff", borderColor: "#fff", shape: "circle",
      spriteFrame: 0, spriteTimer: 0, facingRight: true, dying: false, dyingTimer: 0,
      isElite: true, gemDropped: false, facing: 0, eliteLife: 0.05,
    });
    engine.update(0.2);
    if (overs !== 1 || engine.player.alive) fail(`elite timer overs=${overs} alive=${engine.player.alive}`);
    engine.stop();
  }

  // ---------------------------------------------------------------- 6. bomb burn does not stack
  {
    const { updateBomb, resetBombIds, bombDamage } = await server.ssrLoadModule("/src/game/weapons/BombWeapon.ts");
    resetBombIds();
    const w = { type: "bomb", level: 8, cooldownTimer: 100, burstShotsLeft: 0, burstTimer: 0, evolved: true, super: false };
    const spawned = [];
    updateBomb(spawned, [], 0, 0, w, 0.02, () => {});
    const expected = bombDamage(w) * 0.15;
    if (!spawned.length || Math.abs(spawned[0].burnDamage - expected) > 1e-6) {
      fail(`burn damage ${spawned[0] && spawned[0].burnDamage} expected ${expected}`);
    }
    resetBombIds();
    const enemy = {
      id: 1, x: 0, y: 0, radius: 10, hp: 100000, maxHp: 100000, alive: true,
      speed: 0, baseSpeed: 0, damage: 0, contactTimer: 9,
      enemyType: "slime", color: "#fff", borderColor: "#fff", shape: "circle",
      spriteFrame: 0, spriteTimer: 0, facingRight: true, dying: false, dyingTimer: 0,
      isElite: false, gemDropped: false, facing: 0,
    };
    const field = (id) => ({
      id, x: 0, y: 0, targetX: 0, targetY: 0,
      fallTimer: 1, fallTime: 0.8, explosionRadius: 50, damage: 100,
      phase: "burning", explosionTimer: 0.3, hitIds: new Set(),
      burnRadius: 40, burnDamage: 10, burnDuration: 4,
      burnTimer: 0, burnTickTimer: 0.49, burnHitTimers: new Map(),
    });
    const bombs = [field(1), field(2)];
    const hold = { type: "bomb", level: 8, cooldownTimer: 0, burstShotsLeft: 0, burstTimer: 0, evolved: false, super: false };
    updateBomb(bombs, [enemy], 0, 0, hold, 1 / 60, () => {});
    if (enemy.hp !== 99990) fail(`overlapping burn first tick hp ${enemy.hp}`);
    updateBomb(bombs, [enemy], 0, 0, hold, 0.5, () => {});
    if (enemy.hp !== 99980) fail(`overlapping burn second tick hp ${enemy.hp}`);
  }
} catch (err) {
  fail(`setup: ${err && err.stack ? err.stack : err}`);
} finally {
  await server.close();
}

if (failures.length) {
  console.error(`\n[sim] FAILED (${failures.length})`);
  for (const f of failures) console.error("  - " + f);
  process.exit(1);
}
console.log("\n[sim] OK");
