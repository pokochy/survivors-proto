// ============================================================
//  data.ts — Character & trait definitions for meta-progression
// ============================================================

export type StartWeaponType = "bullet" | "melee" | "bomb" | "trap" | "aura" | "shuriken" | "claw";

export type PassiveType =
  | "none"
  | "extraReroll"       // +1 reroll every level-up
  | "lowHpFury"         // damage scales up as HP drops
  | "guardianWall"      // flat damage reduction + contact reflect
  | "swiftLooter"       // movespeed-based bonus damage + larger pickup
  | "spellPower"        // all damage +15%
  | "critStrike";       // 15% chance to deal 2x damage

export interface CharacterDef {
  id: string;
  name: string;
  color: string;
  desc: string;
  // Base stat modifiers applied when this character is selected
  hpMult: number;
  speedMult: number;
  damageMult: number;
  cooldownMult: number;
  // Starting weapon color override
  projectileColor: string;
  // Starting weapon type
  startWeapon: StartWeaponType;
  // Special characters are locked from gacha until their unlockAchievement is completed
  special?: boolean;
  unlockAchievement?: string;
  passive: PassiveType;
  passiveDesc: string;
}

export interface OwnedCharacter {
  id: string;
  level: number;       // 1~10
  stars: number;       // 0~5, enhances base stats further
  memories: number;    // 기억 — earned from gacha duplicates
  breakthrough: number; // 0~4 돌파 단계
}

export interface TraitDef {
  id: string;
  name: string;
  desc: string;
  maxLevel: number;
  // Effect per level (applied to all characters)
  effectLabel: (level: number) => string;
}

// ---- Characters ----
export const CHARACTERS: CharacterDef[] = [
  {
    id: "survivor",
    name: "생존자",
    color: "#22d3ee",
    desc: "균형 잡힌 기본 캐릭터. 모든 스탯이 표준적입니다.",
    hpMult: 1.0,
    speedMult: 1.0,
    damageMult: 1.0,
    cooldownMult: 1.0,
    projectileColor: "#fbbf24",
    startWeapon: "bullet",
    passive: "extraReroll",
    passiveDesc: "레벨업마다 리롤 +1회",
  },
  {
    id: "berserker",
    name: "버서커",
    color: "#ef4444",
    desc: "높은 대미지, 낮은 체력. 공격형 플레이어용.",
    hpMult: 0.8,
    speedMult: 1.1,
    damageMult: 1.4,
    cooldownMult: 1.0,
    projectileColor: "#f87171",
    startWeapon: "melee",
    passive: "lowHpFury",
    passiveDesc: "체력이 낮을수록 공격력 증가 (최대 +50%)",
  },
  {
    id: "guardian",
    name: "가디언",
    color: "#3b82f6",
    desc: "높은 체력, 느린 속도. 탱커형 캐릭터.",
    hpMult: 1.5,
    speedMult: 0.85,
    damageMult: 0.9,
    cooldownMult: 1.0,
    projectileColor: "#93c5fd",
    startWeapon: "trap",
    passive: "guardianWall",
    passiveDesc: "받는 피해 15% 감소 · 근접 적에게 반사 피해",
  },
  {
    id: "scout",
    name: "스카웃",
    color: "#22c55e",
    desc: "빠른 이동속도, 빠른 공격 속도. 낮은 체력.",
    hpMult: 0.75,
    speedMult: 1.3,
    damageMult: 0.85,
    cooldownMult: 0.8,
    projectileColor: "#86efac",
    startWeapon: "bomb",
    passive: "swiftLooter",
    passiveDesc: "이동속도의 30%만큼 추가 공격력 · 흡수 범위 +20%",
  },
  {
    id: "mage",
    name: "메이지",
    color: "#a855f7",
    desc: "강한 화력과 넓은 사거리, 매우 낮은 체력.",
    hpMult: 0.65,
    speedMult: 0.95,
    damageMult: 1.6,
    cooldownMult: 1.1,
    projectileColor: "#d8b4fe",
    startWeapon: "aura",
    passive: "spellPower",
    passiveDesc: "모든 공격 피해 +15%",
  },
  {
    id: "linya",
    name: "리냐",
    color: "#1f2937",
    desc: "검은 고양이 수인. 날렵한 몸놀림과 비도를 활용한 민첩한 전투를 펼칩니다.",
    hpMult: 0.85,
    speedMult: 1.25,
    damageMult: 1.1,
    cooldownMult: 0.9,
    projectileColor: "#c4b5fd",
    startWeapon: "shuriken",
    special: true,
    unlockAchievement: "evo_shuriken",
    passive: "critStrike",
    passiveDesc: "15% 확률로 치명타 (2배 피해)",
  },
  {
    id: "euroan",
    name: "에우로안",
    color: "#16a34a",
    desc: "드루이드 전사. 튼튼한 몸을 믿고 전방에서 화력을 투사하는 파워형 캐릭터.",
    hpMult: 1.35,
    speedMult: 0.9,
    damageMult: 1.25,
    cooldownMult: 0.95,
    projectileColor: "#84cc16",
    startWeapon: "claw",
    special: true,
    unlockAchievement: "evo_claw",
    passive: "guardianWall",
    passiveDesc: "받는 피해 15% 감소 · 근접 적에게 반사 피해",
  },
];

// ---- Traits ----
export const TRAITS: TraitDef[] = [
  {
    id: "vitality",
    name: "생명력",
    desc: "모든 캐릭터의 최대 체력이 증가합니다.",
    maxLevel: 10,
    effectLabel: (lv) => `체력 +${lv * 10}%`,
  },
  {
    id: "swiftness",
    name: "신속함",
    desc: "모든 캐릭터의 이동 속도가 증가합니다.",
    maxLevel: 10,
    effectLabel: (lv) => `이동속도 +${lv * 5}%`,
  },
  {
    id: "power",
    name: "공격 강화",
    desc: "모든 캐릭터의 공격력이 증가합니다.",
    maxLevel: 10,
    effectLabel: (lv) => `대미지 +${lv * 8}%`,
  },
  {
    id: "rapidfire",
    name: "연사",
    desc: "모든 캐릭터의 공격 속도가 증가합니다.",
    maxLevel: 10,
    effectLabel: (lv) => `공격 속도 +${lv * 4}%`,
  },
  {
    id: "magnetism",
    name: "자력",
    desc: "경험치 보석 흡수 범위가 증가합니다.",
    maxLevel: 5,
    effectLabel: (lv) => `흡수 범위 +${lv * 15}%`,
  },
  {
    id: "greed",
    name: "탐욕",
    desc: "적 처치 시 추가 경험치를 획득합니다.",
    maxLevel: 5,
    effectLabel: (lv) => `경험치 +${lv * 20}%`,
  },
  {
    id: "reroll",
    name: "리롤",
    desc: "레벨업 시 강화 선택지를 다시 뽑을 수 있는 횟수가 증가합니다.",
    maxLevel: 5,
    effectLabel: (lv) => `리롤 ${lv}회`,
  },
];

// Upgrade costs
export const CHARACTER_UPGRADE_COST = (level: number): number =>
  100 * level;

export const TRAIT_UPGRADE_COST = (level: number): number =>
  50 * (level + 1) * (level + 1);

export const STAR_UP_COST = 500;
export const STAR_UP_STAR_COST = 1; // each awakening costs 1 star
export const GACHA_COST = 300;

// ---- Breakthrough (돌파) ----
// Memories required to reach each breakthrough tier (0→1, 1→2, 2→3, 3→4)
export const BREAKTHROUGH_MEMORY_COSTS: number[] = [1, 3, 7, 10];
export const MAX_BREAKTHROUGH = 4;

// Breakthrough tier effects per character (applied in traitHelper)
// 1돌파: stat boost · 2돌파: xp/pickup · 3돌파: passive enhance · 4돌파: start with paired accessory
export function breakthroughMemoryCost(currentTier: number): number {
  if (currentTier >= MAX_BREAKTHROUGH) return Infinity;
  return BREAKTHROUGH_MEMORY_COSTS[currentTier];
}

// Extra memories earned per gacha duplicate (by current breakthrough tier)
export const DUPE_MEMORY_REWARD = 1;

// Refund calculations — returns gold spent on level upgrades
export function characterTotalSpent(level: number): number {
  let total = 0;
  for (let i = 1; i < level; i++) total += CHARACTER_UPGRADE_COST(i);
  return total;
}

// Star refund for awakening reset
export function characterTotalStars(stars: number): number {
  return STAR_UP_STAR_COST * stars;
}

export function traitTotalSpent(level: number): number {
  let total = 0;
  for (let i = 0; i < level; i++) total += TRAIT_UPGRADE_COST(i);
  return total;
}

// Starting state
export const DEFAULT_OWNED: OwnedCharacter[] = [
  { id: "survivor", level: 1, stars: 0, memories: 0, breakthrough: 0 },
];

export const DEFAULT_TRAIT_LEVELS: Record<string, number> = Object.fromEntries(
  TRAITS.map((t) => [t.id, 0])
);

export const DEFAULT_GOLD = 500;

// ---- Achievements ----
export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  reward: number; // star currency
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "evo_bullet",
    name: "플라즈마의 달인",
    desc: "라이플을 진화시키기",
    reward: 1,
  },
  {
    id: "evo_melee",
    name: "폭풍의 지배자",
    desc: "근접 회전검을 진화시키기",
    reward: 1,
  },
  {
    id: "evo_bomb",
    name: "운석 폭격자",
    desc: "폭발탄을 진화시키기",
    reward: 1,
  },
  {
    id: "evo_trap",
    name: "영혼의 설계자",
    desc: "설치형 트랩을 진화시키기",
    reward: 1,
  },
  {
    id: "evo_aura",
    name: "심판의 수호자",
    desc: "화염 오오라를 진화시키기",
    reward: 1,
  },
  {
    id: "evo_shuriken",
    name: "환영 비도의 달인",
    desc: "비도를 진화시키기",
    reward: 1,
  },
  {
    id: "evo_claw",
    name: "광폭한 야수",
    desc: "야생의 발톱을 진화시키기",
    reward: 1,
  },
];

export const DEFAULT_COMPLETED_ACHIEVEMENTS: string[] = [];

