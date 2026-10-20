// ============================================================
//  config.ts — All balance constants in one place.
//  Tweak these numbers to adjust difficulty and feel.
// ============================================================

export const CONFIG = {
  // ---- Canvas / World ----
  canvasWidth: 960,
  canvasHeight: 720,
  worldBgColor: "#0a0a12",

  // ---- Rendering / performance (저사양 대응) ----
  render: {
    fpsCap: 60,           // 고주사율 모니터에서도 60fps로 제한 (0 = 제한 없음)
    autoLowFrameMs: 24,   // 평균 프레임 간격이 이 값(ms)을 넘으면 (≈42fps 미만)
    autoLowAfterSec: 2,   // …이 시간 이상 지속될 때 auto 품질을 low로 전환
  },

  // ---- Player ----
  player: {
    radius: 14,
    color: "#22d3ee",
    maxHp: 100,
    speed: 180, // px per second
    invulnTime: 0.6, // seconds of i-frames after hit
    startX: 480,
    startY: 360,
    pickupRadius: 50, // gem magnet radius
  },

  // ---- Leveling / XP ----
  leveling: {
    baseXpToNext: 5,      // XP needed for level 1 → 2
    xpGrowth: 1.6,        // per level, through level 10
    xpGrowthLate: 1.4,    // per level from level 11 on
    xpGrowthLateFrom: 11,
    maxLevel: 50,
  },

  // ---- Enemies ----
  enemy: {
    radius: 12,
    color: "#ef4444",
    hp: 10,
    speed: 55,
    damage: 8,
    spawnInterval: 0.8, // seconds at 0:00
    spawnDecayPerSecond: 0.98, // first minute: interval × this, every second
    spawnDecayEarlySeconds: 60,
    spawnDecayPerMinute: 0.75, // after that: interval × this, every minute. No floor.
    maxCount: 120, // at 0:00. Grows by maxCountGrowthPerMinute (100%p) each minute.
    maxCountGrowthPerMinute: 1,
    contactDamageCooldown: 0.5,
    // Regular spawn HP = base × hpPerMinute ^ (elapsed minutes). Elites use elite.hp instead.
    hpPerMinute: 1.5,
  },

  // ---- Enemy types ----
  // unlockedTime: enemies of this type start spawning after this many seconds
  enemyTypes: [
    {
      id: "slime",
      name: "슬라임",
      color: "#ef4444",
      borderColor: "#7f1d1d",
      radius: 12,
      hp: 10,
      speed: 55,
      damage: 8,
      spawnWeight: 10,
      unlockedTime: 0,
      shape: "circle" as const,
    },
    {
      id: "bat",
      name: "박쥐",
      color: "#a78bfa",
      borderColor: "#6d28d9",
      radius: 9,
      hp: 6,
      speed: 95,
      damage: 6,
      spawnWeight: 7,
      unlockedTime: 30,
      shape: "triangle" as const,
    },
    {
      id: "skeleton",
      name: "스켈레톤",
      color: "#e2e8f0",
      borderColor: "#64748b",
      radius: 13,
      hp: 25,
      speed: 45,
      damage: 12,
      spawnWeight: 6,
      unlockedTime: 60,
      shape: "square" as const,
    },
    {
      id: "ghost",
      name: "고스트",
      color: "#67e8f9",
      borderColor: "#0e7490",
      radius: 14,
      hp: 15,
      speed: 65,
      damage: 10,
      spawnWeight: 5,
      unlockedTime: 90,
      shape: "diamond" as const,
    },
    {
      id: "brute",
      name: "브루트",
      color: "#f97316",
      borderColor: "#9a3412",
      radius: 20,
      hp: 80,
      speed: 35,
      damage: 20,
      spawnWeight: 2,
      unlockedTime: 120,
      shape: "hexagon" as const,
    },
    {
      id: "wraith",
      name: "래쓰",
      color: "#f43f5e",
      borderColor: "#881337",
      radius: 11,
      hp: 40,
      speed: 110,
      damage: 15,
      spawnWeight: 3,
      unlockedTime: 180,
      shape: "star" as const,
    },
    {
      id: "wolf",
      name: "늑대",
      color: "#94a3b8",
      borderColor: "#475569",
      radius: 16,
      hp: 60,
      speed: 85,
      damage: 18,
      spawnWeight: 4,
      unlockedTime: 150,
      shape: "sprite" as const,
    },
  ] as const,

  // ---- Elite enemies (spawn every 60s) ----
  elite: {
    spawnInterval: 60, // seconds between elite spawns
    killSeconds: 30, // game over if this elite is still alive
    hp: 500,           // same for every elite, regardless of the borrowed type
    hpPerMinute: 2,    // spawn HP = hp × hpPerMinute ^ (elapsed minutes)
    damageMult: 1.5,
    speedMult: 0.9,
    radiusMult: 1.8,
    color: "#fbbf24",
    borderColor: "#f59e0b",
  },

  // ---- Gems ----
  gem: {
    radius: 7,
    color: "#7dd3fc", // bright sky; merged gems step toward deep blue in GemManager
    magnetSpeed: 280, // px/s when being pulled
  },

  // Rare kill drop. One roll per kill; the three pickups are equally likely.
  special: {
    dropChance: 1 / 300,
    radius: 13,
    pullSpeed: 720, // px/s, magnet pickup yanks every XP gem on the map
  },

  // ---- Max weapons a player can hold ----
  maxWeapons: 6,

  // ---- Max accessories a player can hold ----
  maxAccessories: 5,

  // ---- Accessory definitions ----
  // Passive trinkets that boost stats. Level starts at 1; upgrading increases the effect.
  accessories: {
    swiftBoots: {
      name: "질풍의 부츠",
      desc: "이동 속도 증가",
      icon: "wind",
      baseMoveSpeedMult: 1.10,
      growthMoveSpeedMult: 0.05,
      maxLevel: 5,
    },
    vitalRing: {
      name: "생명의 반지",
      desc: "최대 체력 증가",
      icon: "heart",
      baseMaxHpAdd: 25,
      growthMaxHpAdd: 15,
      maxLevel: 5,
    },
    magnetCharm: {
      name: "자석 부적",
      desc: "경험치 흡수 범위 증가",
      icon: "magnet",
      basePickupMult: 1.20,
      growthPickupMult: 0.10,
      maxLevel: 5,
    },
    powerAmulet: {
      name: "전투의 부적",
      desc: "모든 무기 공격력 증가",
      icon: "sword",
      baseDamageMult: 1.10,
      growthDamageMult: 0.06,
      maxLevel: 5,
    },
    hastePendant: {
      name: "질주의 목걸이",
      desc: "모든 무기 쿨다운 감소",
      icon: "zap",
      baseCooldownMult: 0.92,
      growthCooldownMult: -0.03,
      maxLevel: 5,
    },
    xpcrystal: {
      name: "지혜의 결정",
      desc: "경험치 획득량 증가",
      icon: "gem",
      baseXpMult: 1.15,
      growthXpMult: 0.08,
      maxLevel: 5,
    },
    thornArmor: {
      name: "가시 갑옷",
      desc: "접촉한 적에게 피해 반사",
      icon: "shield",
      baseReflectDamage: 5,
      growthReflectDamage: 4,
      maxLevel: 5,
    },
    shieldForge: {
      name: "수호의 방패",
      desc: "받는 피해 감소",
      icon: "shield-check",
      baseDamageReduction: 0.05,
      growthDamageReduction: 0.04,
      maxLevel: 5,
    },
    natureBlessing: {
      name: "자연의 축복",
      desc: "초당 체력 재생량 증가",
      icon: "leaf",
      baseRegenPerSec: 0.5,
      growthRegen: 0.8 / 3,
      maxLevel: 5,
    },
  } as Record<string, AccessoryDef>,

  // ---- Weapon definitions ----
  // Each weapon type has its own base stats.
  // `level` starts at 1; upgrading increases damage, cooldown, etc.
  weapons: {
    bullet: {
      name: "라이플",
      desc: "가까운 적에게 탄환을 버스트로 연사 — 투두두 쏘고 잠깐 대기",
      color: "#fbbf24",
      baseDamage: 7,
      baseBurstCount: 3,
      baseBurstInterval: 0.08,
      baseBurstPause: 1.2,
      baseProjectileSpeed: 340,
      basePierce: 1,
      baseProjectileRadius: 5,
      range: 350,
      damageGrowth: 1.18,
      burstPauseGrowth: 0.90,
      speedGrowth: 1.10,
      maxLevel: 8,
    },
    melee: {
      name: "근접 회전검",
      desc: "플레이어 주변을 회전하며 적을 베는 칼날",
      color: "#f472b6",
      baseDamage: 18,
      baseCooldown: 0,    // continuous, not timer-based
      baseBladeRadius: 55, // swing orbit radius
      baseBladeSize: 16,
      baseBladeCount: 2,
      hitCooldown: 0.4,   // per-enemy re-hit delay
      damageGrowth: 1.25,
      bladeCountGrowth: 1, // +1 blade every 2 levels
      bladeRadiusGrowth: 1.08,
      maxLevel: 8,
    },
    bomb: {
      name: "폭발탄",
      desc: "무작위 적 근처에 투하되어 범위 폭발",
      color: "#fb923c",
      baseDamage: 30,
      baseCooldown: 3.0,
      baseExplosionRadius: 55,
      baseFallTime: 0.8,  // time before detonation
      damageGrowth: 1.30,
      cooldownGrowth: 0.90,
      explosionRadiusGrowth: 1.12,
      maxLevel: 8,
    },
    trap: {
      name: "설치형 트랩",
      desc: "필드에 설치되어 닿은 적에게 지속 피해",
      color: "#34d399",
      baseDamage: 8,
      baseCooldown: 4.0,
      baseTrapRadius: 20,
      baseTrapLifetime: 6.0,
      baseMaxTraps: 3,
      hitCooldown: 0.5,
      damageGrowth: 1.20,
      cooldownGrowth: 0.92,
      trapLifetimeGrowth: 1.15,
      maxTrapsGrowth: 1,  // +1 trap every 3 levels
      maxLevel: 8,
    },
    aura: {
      name: "화염 오오라",
      desc: "플레이어 주변의 적에게 지속 데미지",
      color: "#f87171",
      baseDamage: 2.5,
      baseCooldown: 0,     // continuous tick
      baseAuraRadius: 70,
      tickInterval: 0.5,
      damageGrowth: 1.25,
      auraRadiusGrowth: 1.10,
      maxLevel: 8,
    },
    shuriken: {
      name: "비도",
      desc: "여러 개를 동시에 던져 적을 관통하는 투척 무기",
      color: "#c4b5fd",
      baseDamage: 14,
      baseCooldown: 1.4,
      baseProjectileSpeed: 300,
      baseRange: 400,
      basePierce: 3,
      baseProjectileRadius: 9,
      damageGrowth: 1.22,
      cooldownGrowth: 0.93,
      speedGrowth: 1.08,
      maxLevel: 8,
    },
    claw: {
      name: "야생의 발톱",
      desc: "주변의 적을 주기적으로 긁어버리는 야생의 일격",
      color: "#84cc16",
      baseDamage: 22,
      baseCooldown: 1.6,
      baseRadius: 80,
      baseSlashCount: 1,
      hitCooldown: 0.0, // per-slash: hits all in radius once per slash
      damageGrowth: 1.28,
      cooldownGrowth: 0.92,
      radiusGrowth: 1.06,
      maxLevel: 8,
    },
  } as const,

};

interface AccessoryDef {
  name: string;
  desc: string;
  icon: string;
  maxLevel: number;
  baseMoveSpeedMult?: number;
  growthMoveSpeedMult?: number;
  baseMaxHpAdd?: number;
  growthMaxHpAdd?: number;
  baseRegenPerSec?: number;
  growthRegen?: number;
  basePickupMult?: number;
  growthPickupMult?: number;
  baseDamageMult?: number;
  growthDamageMult?: number;
  baseCooldownMult?: number;
  growthCooldownMult?: number;
  baseXpMult?: number;
  growthXpMult?: number;
  baseReflectDamage?: number;
  growthReflectDamage?: number;
  baseDamageReduction?: number;
  growthDamageReduction?: number;
}

// Derived helper: XP required to go from `level` to `level+1`.
// 1.6× through level 10, then 1.4×. The first step stays baseXpToNext.
export function xpForLevel(level: number): number {
  const { baseXpToNext, xpGrowth, xpGrowthLate, xpGrowthLateFrom } = CONFIG.leveling;
  const early = xpGrowthLateFrom - 1;
  if (level <= early) {
    return Math.floor(baseXpToNext * Math.pow(xpGrowth, level - 1));
  }
  return Math.floor(
    baseXpToNext * Math.pow(xpGrowth, early - 1) * Math.pow(xpGrowthLate, level - early),
  );
}

/** HP multiplier for a regular enemy spawned at `elapsedSeconds`. 1 at 0:00, 1.5 at 1:00, 2.25 at 2:00. */
export function enemyHpScale(elapsedSeconds: number, growthMult = 1): number {
  return Math.pow(CONFIG.enemy.hpPerMinute * growthMult, elapsedSeconds / 60);
}

/** Elite HP at spawn. 500 at 0:00, 1000 at 1:00, 2000 at 2:00. Does not use the type's HP. */
export function eliteHp(elapsedSeconds: number, growthMult = 1): number {
  return CONFIG.elite.hp * Math.pow(CONFIG.elite.hpPerMinute * growthMult, elapsedSeconds / 60);
}

/**
 * Seconds between regular spawns. Starts at spawnInterval.
 * The first minute multiplies by spawnDecayPerSecond each second.
 * After that, multiplies by spawnDecayPerMinute each minute. No minimum.
 */
export function regularSpawnInterval(elapsedSeconds: number): number {
  const { spawnInterval, spawnDecayPerSecond, spawnDecayEarlySeconds, spawnDecayPerMinute } = CONFIG.enemy;
  const early = Math.min(Math.max(0, elapsedSeconds), spawnDecayEarlySeconds);
  const lateMinutes = Math.max(0, elapsedSeconds - spawnDecayEarlySeconds) / 60;
  return (
    spawnInterval *
    Math.pow(spawnDecayPerSecond, early) *
    Math.pow(spawnDecayPerMinute, lateMinutes)
  );
}

/** Regular-enemy cap. 100% of maxCount at the start, plus 100 percentage points per minute. */
export function enemyCap(elapsedSeconds: number, countMult = 1): number {
  const minutes = elapsedSeconds / 60;
  return Math.floor(
    CONFIG.enemy.maxCount * (1 + CONFIG.enemy.maxCountGrowthPerMinute * minutes) * countMult,
  );
}
