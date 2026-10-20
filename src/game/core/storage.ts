// ============================================================
//  storage.ts — localStorage persistence for meta-progression
//
//  세이브 스키마는 버전 관리된다. 저장 구조를 바꾸는 업데이트를 할 때는:
//   1) SAVE_SCHEMA_VERSION 을 1 올리고
//   2) MIGRATIONS 에 "이전 버전 → 새 버전" 변환 함수를 추가한다.
//  기존 플레이어의 세이브는 로드 시 순서대로 자동 변환된다.
//  ⚠ STORAGE_KEY 는 절대 바꾸지 않는다 (바꾸면 모든 기존 세이브가 사라진 것처럼 보인다).
// ============================================================

import { normalizeConstraintLevels } from "@/game/data/constraints";
import {
  DEFAULT_GOLD,
  DEFAULT_OWNED,
  DEFAULT_TRAIT_LEVELS,
  DEFAULT_COMPLETED_ACHIEVEMENTS,
  type OwnedCharacter,
} from "@/game/data/progression";

const STORAGE_KEY = "vs_proto_save";
export const SAVE_STORAGE_KEY = STORAGE_KEY;

/** 현재 세이브 스키마 버전 */
export const SAVE_SCHEMA_VERSION = 3;

export interface SaveData {
  schemaVersion: number;
  gold: number;
  owned: OwnedCharacter[];
  traitLevels: Record<string, number>;
  selectedCharacter: string;
  stars: number;
  completedAchievements: string[];
  /** 제약 단계. 키는 constraints.ts 의 id, 값은 0(해제)부터. */
  constraintLevels: Record<string, number>;
  /** 마지막 저장 시각(ms) — 원클릭 실행기의 디스크 백업과 비교할 때 사용 */
  updatedAt?: number;
}

type RawSave = Record<string, unknown>;

/**
 * MIGRATIONS[n] 은 스키마 n 을 n+1 로 올린다.
 * 함수는 입력을 변경하지 말고 새 객체를 반환할 것.
 */
const MIGRATIONS: Record<number, (raw: RawSave) => RawSave> = {
  // v1 = Bolt 원본 세이브 (schemaVersion 필드 없음)
  // → v2: 캐릭터에 기억(memories)/돌파(breakthrough) 필드 추가, 업적 ID max_* → evo_*
  1: (raw) => {
    const owned = Array.isArray(raw.owned) ? (raw.owned as Partial<OwnedCharacter>[]) : undefined;
    const achievements = Array.isArray(raw.completedAchievements)
      ? (raw.completedAchievements as string[])
      : undefined;
    return {
      ...raw,
      owned: owned?.map((o) => ({ ...o, memories: o.memories ?? 0, breakthrough: o.breakthrough ?? 0 })),
      completedAchievements: achievements?.map((id) => (id.startsWith("max_") ? "evo_" + id.slice(4) : id)),
    };
  },
  // v2 → v3: 로비 제약. 없는 세이브는 전부 해제.
  2: (raw) => ({ ...raw, constraintLevels: raw.constraintLevels ?? {} }),
};

function defaultSave(): SaveData {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    gold: DEFAULT_GOLD,
    owned: [...DEFAULT_OWNED],
    traitLevels: { ...DEFAULT_TRAIT_LEVELS },
    selectedCharacter: "survivor",
    stars: 0,
    completedAchievements: [...DEFAULT_COMPLETED_ACHIEVEMENTS],
    constraintLevels: normalizeConstraintLevels(undefined),
  };
}

/** 원시 세이브를 현재 스키마까지 순서대로 변환한다. */
export function migrateSave(input: RawSave): RawSave {
  let raw = input;
  let version = typeof raw.schemaVersion === "number" ? raw.schemaVersion : 1;
  while (version < SAVE_SCHEMA_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) break; // 누락된 마이그레이션 — 기본값 보정에 맡긴다
    raw = step(raw);
    version++;
  }
  return { ...raw, schemaVersion: Math.max(version, SAVE_SCHEMA_VERSION) };
}

/** 변환된 세이브에 빠진 필드를 기본값으로 채운다. */
function normalize(raw: RawSave): SaveData {
  const base = defaultSave();
  const parsed = raw as Partial<SaveData>;
  return {
    ...base,
    ...parsed,
    owned: (parsed.owned ?? base.owned).map((o) => ({
      ...o,
      memories: o.memories ?? 0,
      breakthrough: o.breakthrough ?? 0,
    })),
    traitLevels: { ...base.traitLevels, ...(parsed.traitLevels ?? {}) },
    stars: parsed.stars ?? 0,
    completedAchievements: parsed.completedAchievements ?? base.completedAchievements,
    constraintLevels: normalizeConstraintLevels(parsed.constraintLevels ?? raw.constraintLevels),
  };
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSave();
    return normalize(migrateSave(JSON.parse(raw) as RawSave));
  } catch {
    return defaultSave();
  }
}

let saveMirror: ((json: string) => void) | null = null;

/**
 * 세이브가 저장될 때마다 함께 호출할 추가 저장소를 등록한다.
 * (원클릭 실행기 모드에서 디스크 백업에 사용 — src/launcherBridge.ts)
 */
export function setSaveMirror(fn: ((json: string) => void) | null): void {
  saveMirror = fn;
}

export function saveSave(data: SaveData): void {
  const json = JSON.stringify({ ...data, schemaVersion: SAVE_SCHEMA_VERSION, updatedAt: Date.now() });
  try {
    localStorage.setItem(STORAGE_KEY, json);
  } catch {
    // ignore quota errors
  }
  saveMirror?.(json);
}
