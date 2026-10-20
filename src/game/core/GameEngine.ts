// ============================================================
//  GameEngine.ts — Main game loop, module integration, pausing
//  React와 독립된 순수 게임 로직. UI는 GameCallbacks로만 통신한다.
// ============================================================

import { CONFIG } from "@/game/data/config";
import type {
  Camera,
  EnemyState,
  GameCallbacks,
  GameStats,
  Gem,
  PlayerState,
  UpgradeOption,
  WeaponType,
} from "@/game/core/types";
import {
  createPlayer,
  updatePlayer,
  gainXp,
  damagePlayer,
  renderPlayer,
} from "@/game/entities/Player";
import {
  updateEnemies,
  checkContactDamage,
  renderEnemies,
  renderEliteMarkers,
  cullDead,
  cullFarEnemies,
  eliteSecondsLeft,
  resetEnemyManager,
  setElapsedTime,
  setEnemyConstraints,
  tickEliteLife,
} from "@/game/entities/EnemyManager";
import { WeaponManager, weaponFormName } from "@/game/systems/WeaponManager";
import { pickUpgrades } from "@/game/systems/upgrades";
import {
  dropGem,
  dropTreasure,
  rollSpecialDrop,
  updateGems,
  renderGems,
  cullGems,
  mergeFarGems,
  consolidateGems,
  resetGemManager,
} from "@/game/entities/GemManager";
import { computeModifiers, type GameModifiers } from "@/game/systems/traitHelper";
import { resolveRunConstraints, type RunConstraints } from "@/game/data/constraints";
import { playHurtSound, playLevelUpSound, playXpPickupSound, playGameOverSound } from "@/game/core/audio";
import { CHARACTERS, type PassiveType } from "@/game/data/progression";
import type { SaveData } from "@/game/core/storage";
import {
  AccessoryManager,
  accessoryName,
  type AccessoryMods,
} from "@/game/systems/AccessoryManager";
import { drawBackground } from "@/game/render/background";
import { renderDecor } from "@/game/render/decor";
import { reportFrameTime, isLowQuality } from "@/game/render/quality";
import { drawTileWorld } from "@/game/render/tileWorld";
import { preloadGameSprites } from "@/game/render/iconSprites";
import { preloadPixel } from "@/game/render/pixel";
import { pixelNames } from "@/assets/pixel";
import { characterSheet } from "@/assets/pixel/catalog";
import { resetEffects, spawnKillPop, spawnLevelUpBurst, updateEffects, renderEffects } from "@/game/render/effects";
import { UI_ICONS, characterIcon } from "@/assets/icons/map";

function getStartWeapon(save: SaveData | null): WeaponType {
  const charId = save?.selectedCharacter ?? "survivor";
  const def = CHARACTERS.find((c) => c.id === charId);
  return (def?.startWeapon ?? "bullet") as WeaponType;
}

export class GameEngine {
  private ctx: CanvasRenderingContext2D;
  private player: PlayerState;
  private enemies: EnemyState[] = [];
  private gems: Gem[] = [];
  private weaponMgr: WeaponManager;
  private accessoryMgr: AccessoryManager;
  private baseMaxHp: number = 0;

  private input = { up: false, down: false, left: false, right: false };
  private camera: Camera = { x: 0, y: 0 };
  private rafId: number | null = null;
  private lastTime = 0;
  private elapsed = 0;
  private kills = 0;
  private score = 0;
  private paused = false;
  private running = false;
  private callbacks: GameCallbacks;
  private modifiers: GameModifiers;
  private passive: PassiveType;
  private xpMult: number;
  private constraints: RunConstraints = resolveRunConstraints(undefined);
  private failedElite = false;
  private save: SaveData | null;
  private rerollsLeft: number = 0;
  private breakthrough: number = 0;
  private statEmitTimer: number = 0;
  /** FPS cap 기준 시각 */
  private capClock = 0;
  /** 일시정지 중 정지 화면을 이미 그렸는지 */
  private frozenFrameDrawn = false;
  /** Level-ups earned but not yet chosen (multi-level gems, treasure + level-up in one frame) */
  private pendingLevelUps = 0;
  /** Pause requested by the player (ESC / window blur) — separate from the level-up pause */
  private userPaused = false;

  constructor(ctx: CanvasRenderingContext2D, callbacks: GameCallbacks, save?: SaveData) {
    this.ctx = ctx;
    this.callbacks = callbacks;
    this.save = save ?? null;
    this.constraints = resolveRunConstraints(this.save?.constraintLevels);
    this.modifiers = save ? computeModifiers(save) : computeModifiers({
      gold: 0,
      owned: [{ id: "survivor", level: 1, stars: 0, memories: 0, breakthrough: 0 }],
      traitLevels: {},
      selectedCharacter: "survivor",
    } as SaveData);
    this.xpMult = this.modifiers.xpMult;
    this.player = createPlayer({
      hpMult: this.modifiers.hpMult,
      speedMult: this.modifiers.speedMult,
      pickupRangeMult: this.modifiers.pickupRangeMult,
      playerColor: this.modifiers.playerColor,
      emblem: this.emblem(),
      sprite: characterSheet(this.save?.selectedCharacter ?? "survivor"),
    });
    this.camera = { x: this.player.x, y: this.player.y };
    preloadGameSprites([
      UI_ICONS.treasure, UI_ICONS.crown, this.emblem(), "proj-dagger", "proj-blade",
      "weapon-bomb", "weapon-bomb-evo", "weapon-trap", "weapon-trap-evo", "weapon-shuriken-evo",
      ...CONFIG.enemyTypes.map((t) => `enemy-${t.id}`),
    ]);
    preloadPixel(pixelNames()); // ~300 KB of small PNGs, all used in play
    this.weaponMgr = new WeaponManager(getStartWeapon(this.save));
    this.accessoryMgr = new AccessoryManager();
    this.baseMaxHp = this.player.maxHp;
    this.rerollsLeft = this.modifiers.rerolls;
    this.passive = this.modifiers.passive;
    this.breakthrough = save?.owned.find((o) => o.id === save.selectedCharacter)?.breakthrough ?? 0;
    if (this.passive === "extraReroll") this.rerollsLeft += 1 + (this.breakthrough >= 3 ? 2 : 0);
    // 4돌파: start with paired accessory
    if (this.modifiers.startAccessory) {
      this.accessoryMgr.addAccessory(this.modifiers.startAccessory);
    }
    this.applyAccessoryMods();
  }

  /** Recompute accessory modifiers and apply them to player + weapon mods. */
  private applyAccessoryMods(): void {
    const accMods = this.accessoryMgr.computeMods();

    // HP: restore base, add accessory bonus, keep ratio
    const oldMaxHp = this.player.maxHp;
    const ratio = oldMaxHp > 0 ? this.player.hp / oldMaxHp : 1;
    this.player.maxHp = this.baseMaxHp + accMods.maxHpAdd;
    this.player.hp = Math.min(this.player.maxHp, Math.round(this.player.maxHp * ratio));

    // Move speed: apply as multiplier on current speed (relative to base)
    // We re-derive base speed from CONFIG to avoid compounding
    const baseSpeed = CONFIG.player.speed * this.modifiers.speedMult;
    this.player.speed = baseSpeed * accMods.moveSpeedMult;

    // Pickup range: same approach
    const swiftLooterBonus = this.passive === "swiftLooter" ? (this.breakthrough >= 3 ? 1.4 : 1.2) : 1;
    const basePickup = CONFIG.player.pickupRadius * this.modifiers.pickupRangeMult * swiftLooterBonus;
    this.player.pickupRadius = basePickup * accMods.pickupMult;

    // XP multiplier: character base × accessory bonus × constraint
    this.xpMult = this.modifiers.xpMult * accMods.xpMult * this.constraints.xp;
    setEnemyConstraints({
      hp: this.constraints.enemyHp,
      damage: this.constraints.enemyDamage,
      speed: this.constraints.enemySpeed,
      hpGrowth: this.constraints.hpGrowth,
      spawn: this.constraints.spawnInterval,
    });

    this.updateWeaponMods();
  }

  /** Recompute weapon damage/cooldown/crit mods only (called each frame for dynamic passives). */
  private updateWeaponMods(accMods?: AccessoryMods): void {
    const mods = accMods ?? this.accessoryMgr.computeMods();
    let dmgMult = this.modifiers.damageMult * mods.damageMult * this.constraints.playerDamage;
    let critChance = 0;

    if (this.passive === "spellPower") dmgMult *= this.breakthrough >= 3 ? 1.25 : 1.15;

    if (this.passive === "swiftLooter") {
      const speedRatio = this.modifiers.speedMult - 1.0;
      dmgMult *= 1 + Math.max(0, speedRatio) * 0.3;
    }

    if (this.passive === "lowHpFury" && this.player.maxHp > 0) {
      const hpRatio = this.player.hp / this.player.maxHp;
      if (hpRatio < 0.5) {
        const fury = (0.5 - Math.max(hpRatio, 0.25)) / 0.25;
        dmgMult *= 1 + fury * (this.breakthrough >= 3 ? 0.8 : 0.5);
      }
    }

    if (this.passive === "critStrike") {
      critChance = this.breakthrough >= 3 ? 0.25 : 0.15;
    }

    this.weaponMgr.setMods({
      damageMult: dmgMult,
      cooldownMult: this.modifiers.cooldownMult * mods.cooldownMult,
      critChance,
    });
  }

  // ---- Input ----
  setInput(key: string, pressed: boolean): void {
    switch (key) {
      case "w": case "arrowup":    this.input.up = pressed; break;
      case "s": case "arrowdown":  this.input.down = pressed; break;
      case "a": case "arrowleft":  this.input.left = pressed; break;
      case "d": case "arrowright": this.input.right = pressed; break;
    }
  }

  /** Release all movement keys (call on window blur so keys don't get stuck). */
  clearInput(): void {
    this.input.up = this.input.down = this.input.left = this.input.right = false;
  }

  /** Player pause (pause menu). Has no effect on the level-up pause. */
  setUserPaused(paused: boolean): void {
    this.userPaused = paused;
    if (paused) this.clearInput();
  }

  isUserPaused(): boolean {
    return this.userPaused;
  }

  // ---- Lifecycle ----
  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.capClock = this.lastTime;
    this.frozenFrameDrawn = false;
    this.rafId = requestAnimationFrame(this.loop);
  }

  stop(): void {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  reset(): void {
    this.constraints = resolveRunConstraints(this.save?.constraintLevels);
    if (this.save) {
      this.modifiers = computeModifiers(this.save);
      this.xpMult = this.modifiers.xpMult;
    }
    this.player = createPlayer({
      hpMult: this.modifiers.hpMult,
      speedMult: this.modifiers.speedMult,
      pickupRangeMult: this.modifiers.pickupRangeMult,
      playerColor: this.modifiers.playerColor,
      emblem: this.emblem(),
      sprite: characterSheet(this.save?.selectedCharacter ?? "survivor"),
    });
    this.camera = { x: this.player.x, y: this.player.y };
    this.enemies = [];
    this.gems = [];
    this.weaponMgr.reset(getStartWeapon(this.save));
    this.accessoryMgr.reset();
    this.baseMaxHp = this.player.maxHp;
    this.rerollsLeft = this.modifiers.rerolls;
    this.breakthrough = this.save?.owned.find((o) => o.id === (this.save?.selectedCharacter ?? ""))?.breakthrough ?? 0;
    if (this.passive === "extraReroll") this.rerollsLeft += 1 + (this.breakthrough >= 3 ? 2 : 0);
    // 4돌파: start with paired accessory
    if (this.modifiers.startAccessory) {
      this.accessoryMgr.addAccessory(this.modifiers.startAccessory);
    }
    this.applyAccessoryMods();
    this.elapsed = 0;
    this.kills = 0;
    this.score = 0;
    this.failedElite = false;
    this.paused = false;
    this.userPaused = false;
    this.pendingLevelUps = 0;
    this.clearInput();
    resetEnemyManager();
    resetGemManager();
    resetEffects();
  }

  /** Icon name of the selected character's emblem (drawn on the player). */
  private emblem(): string {
    return characterIcon(this.save?.selectedCharacter ?? "survivor");
  }

  /** Drop the reward of a newly killed enemy exactly once (+ cosmetic kill pop). */
  private dropReward(e: EnemyState): void {
    if (e.gemDropped) return;
    this.gems.push(e.isElite ? dropTreasure(e) : dropGem(e));
    const special = rollSpecialDrop(e);
    if (special) this.gems.push(special);
    e.gemDropped = true;
    spawnKillPop(e.x, e.y, e.isElite ? "#fbbf24" : e.color, e.radius);
  }

  /** Bomb pickup: every enemy whose body overlaps the camera view dies. */
  private detonateScreen(): void {
    const hw = CONFIG.canvasWidth / 2;
    const hh = CONFIG.canvasHeight / 2;
    const cx = this.camera.x;
    const cy = this.camera.y;
    for (const e of this.enemies) {
      if (!e.alive || e.dying) continue;
      if (Math.abs(e.x - cx) > hw + e.radius) continue;
      if (Math.abs(e.y - cy) > hh + e.radius) continue;
      e.hp = 0;
      e.alive = false;
      this.kills++;
      this.dropReward(e);
    }
    playHurtSound();
  }

  private loop = (now: number): void => {
    if (!this.running) return;
    this.rafId = requestAnimationFrame(this.loop);

    // FPS cap: 고주사율(120/144Hz) 모니터에서 불필요한 프레임을 건너뛴다.
    // 2ms 여유를 둬서 60Hz 모니터의 프레임 간격 흔들림으로 프레임이 빠지지 않게 한다.
    const cap = CONFIG.render.fpsCap;
    if (cap > 0) {
      const interval = 1000 / cap;
      const sinceTick = now - this.capClock;
      if (sinceTick < interval - 2) return;
      this.capClock = now - (sinceTick % interval);
    }

    const frameMs = now - this.lastTime;
    const dt = Math.min(frameMs / 1000, 0.05);
    this.lastTime = now;

    if (!this.paused && !this.userPaused && this.player.alive) {
      reportFrameTime(frameMs);
      this.update(dt);
      this.render();
      this.frozenFrameDrawn = false;
    } else if (!this.frozenFrameDrawn) {
      // 레벨업 일시정지·게임오버 중에는 마지막 화면을 한 번만 그리고 멈춘다.
      // (그 위에 뜨는 반투명 모달 뒤에서 캔버스를 계속 다시 그리지 않도록 — GPU 유휴)
      this.render();
      this.frozenFrameDrawn = true;
    }
  };

  // ---- Update ----
  private update(dt: number): void {
    this.elapsed += dt;
    this.score = Math.floor(this.kills * 10 + this.elapsed * 5);

    // Re-apply weapon mods each frame for dynamic passives (lowHpFury)
    const accMods = this.accessoryMgr.computeMods();
    this.updateWeaponMods(accMods);

    setElapsedTime(this.elapsed);
    updatePlayer(this.player, this.input, dt);
    // Camera follows player — player stays centered on screen
    this.camera.x = this.player.x;
    this.camera.y = this.player.y;
    updateEnemies(this.enemies, this.player, dt);
    if (tickEliteLife(this.enemies, dt)) {
      this.failedElite = true;
      this.player.alive = false;
    }

    const contactDmg = checkContactDamage(this.enemies, this.player);
    if (contactDmg > 0) {
      // Shield Forge + guardianWall: reduce incoming damage
      const guardianReduction = this.passive === "guardianWall" ? (this.breakthrough >= 3 ? 0.25 : 0.15) : 0;
      const reducedDmg = contactDmg * (1 - accMods.damageReduction - guardianReduction);
      playHurtSound();
      damagePlayer(this.player, reducedDmg);

      // Thorn Armor + guardianWall: reflect damage to contacting enemies
      const guardianReflect = this.passive === "guardianWall" ? (this.breakthrough >= 3 ? 6 : 3) : 0;
      const reflectDmg = accMods.reflectDamage + guardianReflect;
      if (reflectDmg > 0) {
        for (const e of this.enemies) {
          if (!e.alive || e.dying) continue;
          const dx = e.x - this.player.x;
          const dy = e.y - this.player.y;
          const collideR = e.radius + this.player.radius + 5;
          if (dx * dx + dy * dy < collideR * collideR) {
            e.hp -= reflectDmg;
            if (e.hp <= 0 && !e.dying) {
              e.alive = false;
              this.kills++;
              this.dropReward(e);
            }
          }
        }
      }
    }

    // Vital Ring: HP regen
    if (accMods.regenPerSec > 0 && this.player.hp < this.player.maxHp) {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + accMods.regenPerSec * dt);
    }

    // Weapons — onKill just counts kills; gem drops handled in single pass below
    this.weaponMgr.update(this.enemies, this.player, dt, () => {
      this.kills++;
    });

    // Single pass for gem drops from newly dead enemies
    for (const e of this.enemies) {
      if ((!e.alive || e.dying) && !e.gemDropped) this.dropReward(e);
    }
    updateEffects(dt);

    this.enemies = cullDead(this.enemies);
    this.enemies = cullFarEnemies(this.enemies, this.player.x, this.player.y);

    const gemResult = updateGems(this.gems, this.player, dt);
    if (gemResult.heart) {
      this.player.hp = this.player.maxHp;
      playLevelUpSound();
    }
    if (gemResult.magnet) {
      for (const g of this.gems) {
        if (g.alive && !g.isTreasure && !g.pickup) g.attracted = true;
      }
    }
    if (gemResult.bomb) this.detonateScreen();
    const treasurePicked = gemResult.treasure;
    const xpGained = gemResult.xp * this.xpMult;
    this.gems = cullGems(this.gems);
    // Merge far gems into nearby ones instead of deleting them
    const gemMaxDist = CONFIG.canvasWidth * 1.2;
    this.gems = mergeFarGems(this.gems, this.player.x, this.player.y, gemMaxDist);
    // Auto-consolidate when too many gems on screen — merge nearby pairs
    this.gems = consolidateGems(this.gems, 40, 80);

    if (xpGained > 0) {
      playXpPickupSound(xpGained);
      this.pendingLevelUps += gainXp(this.player, xpGained);
    }

    // Treasure chest = one extra level-up choice regardless of XP
    if (treasurePicked) this.pendingLevelUps++;

    if (this.pendingLevelUps > 0 && this.player.alive) {
      this.openNextLevelUp();
    }

    // Throttle stat emission to every ~8 frames to reduce per-frame garbage
    this.statEmitTimer += dt;
    // The elite countdown is shown as whole seconds, so emit every frame while it runs.
    if (eliteSecondsLeft(this.enemies) != null || this.statEmitTimer >= 0.15) {
      this.statEmitTimer = 0;
      this.emitStats();
    }

    if (!this.player.alive) {
      playGameOverSound(); // same sound as giving up (was missing on a real death)
      this.callbacks.onGameOver(this.getStats());
    }
  }

  // ---- Give up (triggers game over with current stats) ----
  giveUp(): void {
    if (!this.player.alive) return;
    this.player.alive = false;
    playGameOverSound();
    this.callbacks.onGameOver(this.getStats());
  }

  // ---- Level up ----
  /**
   * Show the next queued level-up choice. Each queued level-up gives exactly one pick.
   * If nothing is left to offer (everything maxed), the queue is dropped instead of
   * opening an empty modal (which would soft-lock the game).
   */
  private openNextLevelUp(): void {
    const options = pickUpgrades(this.weaponMgr, this.accessoryMgr, this.save?.selectedCharacter);
    if (options.length === 0) {
      this.pendingLevelUps = 0;
      this.paused = false;
      return;
    }
    this.pendingLevelUps--;
    this.paused = true;
    playLevelUpSound();
    spawnLevelUpBurst(this.player.x, this.player.y);
    if (this.passive === "extraReroll") this.rerollsLeft += 1 + (this.breakthrough >= 3 ? 2 : 0);
    this.emitStats(); // so the modal shows the up-to-date reroll count
    this.callbacks.onLevelUp(options);
  }

  /** Reroll the current level-up options. Returns new options or null if no rerolls left. */
  rerollUpgrades(): UpgradeOption[] | null {
    if (this.rerollsLeft <= 0) return null;
    this.rerollsLeft--;
    return pickUpgrades(this.weaponMgr, this.accessoryMgr, this.save?.selectedCharacter);
  }

  getRerollsLeft(): number {
    return this.rerollsLeft;
  }

  applyUpgrade(opt: UpgradeOption): void {
    switch (opt.kind) {
      case "newWeapon":
        if (opt.weaponType) this.weaponMgr.addWeapon(opt.weaponType);
        break;
      case "weaponLevel":
        if (opt.weaponType) this.weaponMgr.levelUpWeapon(opt.weaponType);
        break;
      case "weaponEvolve":
        if (opt.weaponType) this.weaponMgr.evolveWeapon(opt.weaponType, this.save?.selectedCharacter);
        break;
      case "newAccessory":
        if (opt.accessoryType) this.accessoryMgr.addAccessory(opt.accessoryType);
        this.applyAccessoryMods();
        break;
      case "accessoryLevel":
        if (opt.accessoryType) this.accessoryMgr.levelUpAccessory(opt.accessoryType);
        this.applyAccessoryMods();
        break;
    }
    if (this.pendingLevelUps > 0) {
      // More level-ups were earned in the same frame — stay paused and offer the next pick.
      // Callers must update their UI state *before* calling applyUpgrade (see GameCanvas).
      this.openNextLevelUp();
    } else {
      this.paused = false;
    }
  }

  /** Level-up choices still waiting after the current one (for the UI). */
  getPendingLevelUps(): number {
    return this.pendingLevelUps;
  }

  // ---- Stats ----
  private getStats(): GameStats {
    return {
      time: this.elapsed,
      kills: this.kills,
      level: this.player.level,
      xp: this.player.xp,
      xpToNext: this.player.xpToNext,
      hp: this.player.hp,
      maxHp: this.player.maxHp,
      alive: this.player.alive,
      score: this.score,
      weapons: this.weaponMgr.weapons.map((w) => ({
        type: w.type,
        name: weaponFormName(w),
        level: w.level,
        evolved: w.evolved,
      })),
      accessories: this.accessoryMgr.accessories.map((a) => ({
        type: a.type,
        name: accessoryName(a.type),
        level: a.level,
      })),
      rerolls: this.rerollsLeft,
      eliteSeconds: eliteSecondsLeft(this.enemies),
      failedElite: this.failedElite,
    };
  }

  private emitStats(): void {
    this.callbacks.onStatsUpdate(this.getStats());
  }

  // ---- Render ----
  private render(): void {
    const ctx = this.ctx;
    // Reset any canvas state that may have been leaked from the previous frame
    // (globalAlpha, shadowBlur, filter, etc.) to prevent afterimages.
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";
    ctx.filter = "none";
    ctx.globalCompositeOperation = "source-over";

    // High quality = pixel-art world/sprites; low quality = the original vector look.
    const pixel = !isLowQuality();
    let camX = this.camera.x - CONFIG.canvasWidth / 2;
    let camY = this.camera.y - CONFIG.canvasHeight / 2;
    if (pixel) {
      // Whole-pixel camera so nearest-neighbour sprites don't shimmer
      camX = Math.round(camX);
      camY = Math.round(camY);
    }

    // Ground: cached tile chunks (high) or background + scrolling grid (low / while loading)
    const tiled = pixel && drawTileWorld(ctx, camX, camY);
    if (!tiled) drawBackground(ctx, camX, camY);

    // World space
    ctx.save();
    ctx.translate(-camX, -camY);
    if (!tiled) renderDecor(ctx, camX, camY);
    renderGems(ctx, this.gems);
    renderEnemies(ctx, this.enemies);
    renderEffects(ctx);
    renderEliteMarkers(ctx, this.enemies);
    this.weaponMgr.render(ctx, this.player);
    renderPlayer(ctx, this.player);
    ctx.restore();
  }
}
