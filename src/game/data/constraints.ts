// ============================================================
//  constraints.ts — Optional run handicaps. Harder steps raise a score,
//  and that score multiplies the gold paid out when the run ends.
// ============================================================

export interface ConstraintStep {
  /** Short label for the stepper, e.g. "×2". */
  label: string;
  /** Multiplier applied to that system. Spawn rate stores the interval scale (faster = smaller). */
  value: number;
  score: number;
}

export interface ConstraintDef {
  id: string;
  name: string;
  desc: string;
  steps: ConstraintStep[];
}

/** Index 0 is always "off": value 1, score 0. */
export const CONSTRAINTS: ConstraintDef[] = [
  {
    id: "enemyHp",
    name: "적의 체력",
    desc: "나타나는 적의 체력",
    steps: [
      { label: "×1", value: 1, score: 0 },
      { label: "×1.5", value: 1.5, score: 15 },
      { label: "×2", value: 2, score: 30 },
      { label: "×3", value: 3, score: 50 },
      { label: "×4", value: 4, score: 75 },
    ],
  },
  {
    id: "enemyDamage",
    name: "적의 공격력",
    desc: "접촉 피해",
    steps: [
      { label: "×1", value: 1, score: 0 },
      { label: "×1.5", value: 1.5, score: 15 },
      { label: "×2", value: 2, score: 30 },
      { label: "×3", value: 3, score: 50 },
    ],
  },
  {
    id: "enemySpeed",
    name: "적의 속도",
    desc: "적의 이동 속도",
    steps: [
      { label: "×1", value: 1, score: 0 },
      { label: "×1.2", value: 1.2, score: 10 },
      { label: "×1.4", value: 1.4, score: 25 },
      { label: "×1.6", value: 1.6, score: 40 },
    ],
  },
  {
    id: "hpGrowth",
    name: "체력 배율",
    desc: "분당 체력 증가. 기본은 일반 적 ×1.5, 엘리트 ×2",
    steps: [
      { label: "×1", value: 1, score: 0 },
      { label: "×1.25", value: 1.25, score: 25 },
      { label: "×1.5", value: 1.5, score: 50 },
      { label: "×2", value: 2, score: 80 },
    ],
  },
  {
    id: "spawnRate",
    name: "출현 속도",
    desc: "적이 나타나는 속도",
    steps: [
      { label: "×1", value: 1, score: 0 },
      { label: "×1.25", value: 0.8, score: 10 },
      { label: "×1.5", value: 1 / 1.5, score: 25 },
      { label: "×2", value: 0.5, score: 40 },
    ],
  },
  {
    id: "playerDamage",
    name: "가하는 피해",
    desc: "무기 피해",
    steps: [
      { label: "×1", value: 1, score: 0 },
      { label: "×0.8", value: 0.8, score: 15 },
      { label: "×0.6", value: 0.6, score: 30 },
      { label: "×0.4", value: 0.4, score: 50 },
    ],
  },
  {
    id: "xpGain",
    name: "경험치 획득",
    desc: "보석으로 얻는 경험치",
    steps: [
      { label: "×1", value: 1, score: 0 },
      { label: "×0.75", value: 0.75, score: 25 },
      { label: "×0.5", value: 0.5, score: 50 },
      { label: "×0.25", value: 0.25, score: 100 },
    ],
  },
];

/** +1% gold per constraint point. Score 0 pays the normal amount. */
export const CONSTRAINT_GOLD_PER_POINT = 0.01;

export interface RunConstraints {
  enemyHp: number;
  enemyDamage: number;
  enemySpeed: number;
  /** Multiplier on the per-minute HP growth. 1 keeps regular ×1.5 and elite ×2. */
  hpGrowth: number;
  spawnInterval: number;
  playerDamage: number;
  xp: number;
}

export function normalizeConstraintLevels(raw: unknown): Record<string, number> {
  const src = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const out: Record<string, number> = {};
  for (const c of CONSTRAINTS) {
    const n = src[c.id];
    const level = typeof n === "number" && Number.isFinite(n) ? Math.floor(n) : 0;
    out[c.id] = Math.min(c.steps.length - 1, Math.max(0, level));
  }
  return out;
}

function stepValue(id: string, levels: Record<string, number>): number {
  const c = CONSTRAINTS.find((item) => item.id === id);
  if (!c) return 1;
  return c.steps[levels[id] ?? 0].value;
}

export function resolveRunConstraints(raw: unknown): RunConstraints {
  const levels = normalizeConstraintLevels(raw);
  return {
    enemyHp: stepValue("enemyHp", levels),
    enemyDamage: stepValue("enemyDamage", levels),
    enemySpeed: stepValue("enemySpeed", levels),
    hpGrowth: stepValue("hpGrowth", levels),
    spawnInterval: stepValue("spawnRate", levels),
    playerDamage: stepValue("playerDamage", levels),
    xp: stepValue("xpGain", levels),
  };
}

export function constraintScore(raw: unknown): number {
  const levels = normalizeConstraintLevels(raw);
  return CONSTRAINTS.reduce((sum, c) => sum + c.steps[levels[c.id]].score, 0);
}

export function constraintGoldMultiplier(score: number): number {
  return 1 + score * CONSTRAINT_GOLD_PER_POINT;
}
