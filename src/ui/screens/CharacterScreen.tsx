import { useState } from "react";
import { ArrowLeft, Star, Check, ChevronUp, Lock, RotateCcw, X, Play, Sparkles } from "lucide-react";
import { PixelFace, PixelWalker } from "@/ui/components/PixelSprite";
import { GameIcon } from "@/ui/components/GameIcon";
import { UI_ICONS, weaponIcon } from "@/ui/icons";
import { readableAccent, weaponColor } from "@/ui/theme";
import {
  CHARACTERS,
  CHARACTER_UPGRADE_COST,
  STAR_UP_STAR_COST,
  characterTotalSpent,
  characterTotalStars,
  breakthroughMemoryCost,
  MAX_BREAKTHROUGH,
  ACHIEVEMENTS,
  type CharacterDef,
  type OwnedCharacter,
} from "@/game/data/progression";
import { weaponName } from "@/game/systems/WeaponManager";
import { breakthroughCombatMult } from "@/game/systems/traitHelper";
import { EVOLUTIONS } from "@/game/data/evolutions";
import { accessoryName } from "@/game/systems/AccessoryManager";
import type { SaveData } from "@/game/core/storage";

interface CharacterScreenProps {
  onBack: () => void;
  save: SaveData;
  onUpdate: (save: SaveData) => void;
}

function getCharDef(id: string): CharacterDef | undefined {
  return CHARACTERS.find((c) => c.id === id);
}

function getOwned(owned: OwnedCharacter[], id: string): OwnedCharacter | undefined {
  return owned.find((o) => o.id === id);
}

export function CharacterScreen({ onBack, save, onUpdate }: CharacterScreenProps) {
  const [selectedId, setSelectedId] = useState<string>(save.selectedCharacter);
  const [showReset, setShowReset] = useState(false);

  const owned = getOwned(save.owned, selectedId);
  const def = getCharDef(selectedId);
  const refundAmount = owned ? characterTotalSpent(owned.level) : 0;
  const refundStars = owned ? characterTotalStars(owned.stars) : 0;
  const canReset = owned !== undefined && (owned.level > 1 || owned.stars > 0);

  function handleSelect(id: string) {
    setSelectedId(id);
    onUpdate({ ...save, selectedCharacter: id });
  }

  function handleUpgradeLevel() {
    if (!owned || owned.level >= 10) return;
    const cost = CHARACTER_UPGRADE_COST(owned.level);
    if (save.gold < cost) return;
    const newOwned = save.owned.map((o) =>
      o.id === owned.id ? { ...o, level: o.level + 1 } : o
    );
    onUpdate({ ...save, gold: save.gold - cost, owned: newOwned });
  }

  function handleStarUp() {
    if (!owned || owned.stars >= 5) return;
    if (save.stars < STAR_UP_STAR_COST) return;
    const newOwned = save.owned.map((o) =>
      o.id === owned.id ? { ...o, stars: o.stars + 1 } : o
    );
    onUpdate({ ...save, stars: save.stars - STAR_UP_STAR_COST, owned: newOwned });
  }

  function handleReset() {
    if (!owned || !canReset) return;
    const newOwned = save.owned.map((o) =>
      o.id === owned.id ? { ...o, level: 1, stars: 0 } : o
    );
    onUpdate({ ...save, gold: save.gold + refundAmount, stars: save.stars + refundStars, owned: newOwned });
    setShowReset(false);
  }

  function handleBreakthrough() {
    if (!owned || owned.breakthrough >= MAX_BREAKTHROUGH) return;
    const cost = breakthroughMemoryCost(owned.breakthrough);
    if (owned.memories < cost) return;
    const newOwned = save.owned.map((o) =>
      o.id === owned.id ? { ...o, memories: o.memories - cost, breakthrough: o.breakthrough + 1 } : o
    );
    onUpdate({ ...save, owned: newOwned });
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">로비로</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-800/60 rounded-lg px-4 py-2 border border-slate-700">
              <GameIcon name={UI_ICONS.gold} size={16} className="text-amber-400" />
              <span className="text-amber-300 font-mono font-bold tabular-nums">{save.gold}</span>
              <span className="text-slate-500 text-xs">G</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-800/60 rounded-lg px-4 py-2 border border-slate-700">
              <GameIcon name={UI_ICONS.star} size={16} className="text-cyan-400" />
              <span className="text-cyan-300 font-mono font-bold tabular-nums">{save.stars}</span>
              <span className="text-slate-500 text-xs">별</span>
            </div>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-slate-100 mb-1">캐릭터 관리</h1>
        <p className="text-slate-500 text-sm mb-6">보유한 캐릭터를 선택하고 강화하세요</p>

        {/* Character grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {CHARACTERS.map((char) => {
            const own = getOwned(save.owned, char.id);
            const isOwned = !!own;
            const isViewing = selectedId === char.id;
            const isPlayChar = save.selectedCharacter === char.id;
            return (
              <button
                key={char.id}
                onClick={() => setSelectedId(char.id)}
                className={`relative flex flex-col items-center rounded-xl border-2 px-3 py-4 transition-all
                  ${isViewing
                    ? "border-cyan-400 bg-cyan-950/40"
                    : isOwned
                      ? "border-slate-700 bg-slate-900/40 hover:border-slate-500"
                      : "border-slate-800 bg-slate-900/40 hover:border-slate-600"
                  }`}
              >
                {!isOwned && (
                  <Lock className="absolute top-2 right-2 w-3.5 h-3.5 text-slate-600" />
                )}
                {isPlayChar && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-cyan-500 px-2 py-0.5 text-[10px] font-bold text-slate-900 whitespace-nowrap">
                    PLAY
                  </span>
                )}
                <div
                  className="w-12 h-12 rounded-lg mb-2 flex items-center justify-center overflow-hidden"
                  style={{ border: `2px solid ${readableAccent(char.color)}` }}
                >
                  <PixelFace kind="char" id={char.id} size={44} color={readableAccent(char.color)} dimmed={!isOwned} />
                </div>
                <span className="text-slate-100 text-xs font-semibold">{char.name}</span>
                {isOwned && own && (
                  <div className="flex items-center gap-1 mt-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-2.5 h-2.5 ${i < own.stars ? "text-amber-400 fill-amber-400" : "text-slate-700"}`}
                      />
                    ))}
                  </div>
                )}
                {isOwned ? (
                  <span className="text-slate-400 text-xs mt-1">Lv {own?.level}</span>
                ) : (
                  <span className="text-slate-600 text-xs mt-1">미보유</span>
                )}
                {isViewing && (
                  <Check className="absolute bottom-1 left-1 w-4 h-4 text-cyan-400" />
                )}
              </button>
            );
          })}
        </div>

        {/* Selected character detail */}
        {def && (
          <div className="rounded-2xl border-2 border-slate-700 bg-slate-900/40 p-6">
            <div className="flex items-start gap-5 mb-5">
              <div
                className="flex-shrink-0 w-20 h-20 rounded-2xl flex items-center justify-center bg-[#2f4a1f]"
                style={{ border: `2px solid ${readableAccent(def.color)}` }}
              >
                <PixelWalker id={def.id} size={64} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-100">{def.name}</h2>
                  {!owned && (
                    <span className="flex items-center gap-1 rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-500 font-medium">
                      <Lock className="w-3 h-3" /> 미보유
                    </span>
                  )}
                </div>
                <p className="text-slate-400 text-sm mt-1">{def.desc}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  <GameIcon name={weaponIcon(def.startWeapon)} size={16} color={weaponColor(def.startWeapon)} />
                  <span className="text-slate-500 text-xs">시작 무기:</span>
                  <span className="text-xs font-semibold" style={{ color: weaponColor(def.startWeapon) }}>{weaponName(def.startWeapon)}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-amber-400 text-xs font-semibold">{def.passiveDesc}</span>
                </div>
              </div>
            </div>

            {/* Stats — level, stars, and 1돌파. Traits stay on the trait screen. */}
            {(() => {
              const stars = owned?.stars ?? 0;
              const level = owned?.level ?? 1;
              const bt = breakthroughCombatMult(owned?.breakthrough ?? 0);
              const starBonus = 1 + stars * 0.05;
              const lvlBonus = 1 + (level - 1) * 0.03;
              const effHp = def.hpMult * starBonus * bt.hp;
              const effSpeed = def.speedMult * starBonus * bt.speed;
              const effDmg = def.damageMult * starBonus * lvlBonus * bt.damage;
              const effAtkSpd = 1 / def.cooldownMult;
              return (
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <StatBar label="최대 체력" value={effHp} display={`${Math.round(effHp * 100)}%`} />
                  <StatBar label="이동 속도" value={effSpeed} display={`${Math.round(effSpeed * 100)}%`} />
                  <StatBar label="공격력" value={effDmg} display={`${Math.round(effDmg * 100)}%`} />
                  <StatBar label="공격 속도" value={effAtkSpd} display={`${Math.round(effAtkSpd * 100)}%`} />
                </div>
              );
            })()}

            {/* Upgrade preview + buttons (only for owned) */}
            {(() => {
              if (!owned) {
                const isSpecialLocked = def.special && def.unlockAchievement && !save.completedAchievements.includes(def.unlockAchievement);
                const unlockAch = def.unlockAchievement ? ACHIEVEMENTS.find((a) => a.id === def.unlockAchievement) : undefined;
                return (
                  <div className="rounded-xl border border-slate-800 bg-slate-800/30 px-4 py-4 flex flex-col items-center gap-2">
                    <Lock className="w-5 h-5 text-slate-600" />
                    {isSpecialLocked ? (
                      <p className="text-amber-300/80 text-sm text-center">
                        {unlockAch ? `${unlockAch.name} 업적 달성 시 뽑기에서 획득할 수 있습니다` : "특정 업적 달성 시 뽑기에서 획득할 수 있습니다"}
                      </p>
                    ) : (
                      <p className="text-slate-500 text-sm text-center">
                        캐릭터 뽑기에서 획득할 수 있습니다
                      </p>
                    )}
                  </div>
                );
              }
              const canLevel = owned.level < 10;
              const canStar = owned.stars < 5;
              const bt = breakthroughCombatMult(owned.breakthrough);
              const starBonus = 1 + owned.stars * 0.05;
              const lvlBonus = 1 + (owned.level - 1) * 0.03;
              const nextLvlBonus = 1 + owned.level * 0.03;
              const nextStarBonus = 1 + (owned.stars + 1) * 0.05;
              const curHp = def.hpMult * starBonus * bt.hp;
              const curDmg = def.damageMult * starBonus * lvlBonus * bt.damage;
              const nextDmgFromLevel = def.damageMult * starBonus * nextLvlBonus * bt.damage;
              const nextHpFromStar = def.hpMult * nextStarBonus * bt.hp;
              const nextDmgFromStar = def.damageMult * nextStarBonus * lvlBonus * bt.damage;
              const isPlayChar = save.selectedCharacter === selectedId;
              return (
                <>
                {/* Play character select button */}
                {!isPlayChar && (
                  <button
                    onClick={() => handleSelect(selectedId)}
                    className="mb-4 w-full flex items-center justify-center gap-2 rounded-lg border-2 border-cyan-700 bg-cyan-950/40 px-4 py-2.5
                               text-cyan-300 text-sm font-semibold transition-all
                               hover:border-cyan-500 hover:bg-cyan-900/40 active:scale-[0.98]"
                  >
                    <Play className="w-4 h-4" />
                    이 캐릭터로 플레이
                  </button>
                )}
                {isPlayChar && (
                  <div className="mb-4 w-full flex items-center justify-center gap-2 rounded-lg border-2 border-cyan-500/50 bg-cyan-950/30 px-4 py-2.5
                               text-cyan-300 text-sm font-semibold">
                    <Check className="w-4 h-4" />
                    플레이 중인 캐릭터
                  </div>
                )}
                <div className="flex gap-3">
                  {/* Level up column */}
                  <div className="flex-1 flex flex-col gap-2">
                    {canLevel && (
                      <div className="rounded-lg border border-cyan-800/50 bg-cyan-950/30 px-3 py-2">
                        <p className="text-cyan-400 text-xs font-semibold mb-1">레벨업 시</p>
                        <p className="text-slate-300 text-xs">
                          공격력 <span className="text-emerald-300 font-mono">{Math.round(curDmg * 100)}%</span>
                          <span className="text-slate-500"> → </span>
                          <span className="text-emerald-300 font-mono">{Math.round(nextDmgFromLevel * 100)}%</span>
                          <span className="text-emerald-400 ml-1">(+3%)</span>
                        </p>
                      </div>
                    )}
                    <button
                      onClick={handleUpgradeLevel}
                      disabled={!canLevel || save.gold < CHARACTER_UPGRADE_COST(owned.level)}
                      className="flex items-center justify-center gap-2 rounded-lg border-2 border-slate-700 bg-slate-800/60 px-4 py-3
                                 transition-all hover:border-cyan-500 hover:bg-slate-700/60 active:scale-[0.98]
                                 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronUp className="w-5 h-5 text-cyan-400" />
                      <span className="text-slate-100 font-semibold text-sm">
                        레벨업 {owned.level}/10
                      </span>
                      {canLevel && (
                        <span className="flex items-center gap-1 text-amber-300 text-xs font-mono">
                          <Star className="w-3 h-3" />
                          {CHARACTER_UPGRADE_COST(owned.level)}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Star up column */}
                  <div className="flex-1 flex flex-col gap-2">
                    {canStar && (
                      <div className="rounded-lg border border-amber-800/50 bg-amber-950/30 px-3 py-2">
                        <p className="text-amber-400 text-xs font-semibold mb-1">각성 시</p>
                        <p className="text-slate-300 text-xs">
                          체력 <span className="text-emerald-300 font-mono">{Math.round(curHp * 100)}%</span>
                          <span className="text-slate-500"> → </span>
                          <span className="text-emerald-300 font-mono">{Math.round(nextHpFromStar * 100)}%</span>
                        </p>
                        <p className="text-slate-300 text-xs">
                          공격력 <span className="text-emerald-300 font-mono">{Math.round(curDmg * 100)}%</span>
                          <span className="text-slate-500"> → </span>
                          <span className="text-emerald-300 font-mono">{Math.round(nextDmgFromStar * 100)}%</span>
                        </p>
                        <p className="text-slate-500 text-xs mt-0.5">전체 스탯 +5%</p>
                      </div>
                    )}
                    <button
                      onClick={handleStarUp}
                      disabled={!canStar || save.stars < STAR_UP_STAR_COST}
                      className="flex items-center justify-center gap-2 rounded-lg border-2 border-slate-700 bg-slate-800/60 px-4 py-3
                                 transition-all hover:border-amber-500 hover:bg-slate-700/60 active:scale-[0.98]
                                 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Star className="w-5 h-5 text-amber-400" />
                      <span className="text-slate-100 font-semibold text-sm">
                        각성 {owned.stars}/5
                      </span>
                      {canStar && (
                        <span className="flex items-center gap-1 text-cyan-300 text-xs font-mono">
                          <Star className="w-3 h-3 fill-cyan-400 text-cyan-400" />
                          {STAR_UP_STAR_COST}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
                </>
              );
            })()}

            {/* Breakthrough section */}
            {owned && (
              <div className="mt-5 rounded-xl border-2 border-violet-800/40 bg-violet-950/20 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <GameIcon name={UI_ICONS.memory} size={16} className="text-violet-400" />
                  <h3 className="text-violet-300 text-sm font-bold">돌파 시스템</h3>
                  <span className="text-slate-500 text-xs ml-auto">
                    기억 <span className="text-violet-300 font-mono font-bold">{owned.memories}</span>개 보유
                  </span>
                </div>

                {/* Breakthrough tier indicators */}
                <div className="flex gap-1.5 mb-3">
                  {[1, 2, 3, 4].map((tier) => (
                    <div
                      key={tier}
                      className={`flex-1 h-2 rounded-full transition-all ${
                        owned.breakthrough >= tier
                          ? "bg-violet-500"
                          : "bg-slate-800"
                      }`}
                    />
                  ))}
                </div>

                {/* All tiers stay listed; achieved rows keep a check. */}
                <div className="space-y-1.5 mb-3">
                  {[1, 2, 3, 4].map((tier) => (
                    <BreakthroughDesc key={tier} tier={tier} current={owned.breakthrough} def={def} />
                  ))}
                </div>
                {owned.breakthrough < MAX_BREAKTHROUGH ? (
                  <button
                    onClick={handleBreakthrough}
                    disabled={owned.memories < breakthroughMemoryCost(owned.breakthrough)}
                    className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-violet-700 bg-violet-900/40 px-4 py-2.5
                               text-violet-200 text-sm font-semibold transition-all
                               hover:border-violet-500 hover:bg-violet-800/40 active:scale-[0.98]
                               disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <GameIcon name={UI_ICONS.breakthrough} size={16} className="text-violet-300" />
                    {owned.breakthrough + 1}돌파 진행
                    <span className="flex items-center gap-1 text-violet-300 text-xs font-mono">
                      <GameIcon name={UI_ICONS.memory} size={12} />
                      {breakthroughMemoryCost(owned.breakthrough)}
                    </span>
                  </button>
                ) : (
                  <div className="flex items-center justify-center gap-2 py-2">
                    <Sparkles className="w-4 h-4 text-violet-400" />
                    <span className="text-violet-300 text-sm font-bold">최대 돌파 달성</span>
                  </div>
                )}
              </div>
            )}

            {/* Reset button */}
            {owned && canReset && (
              <button
                onClick={() => setShowReset(true)}
                className="mt-4 w-full flex items-center justify-center gap-2 rounded-lg border border-slate-700/50 bg-slate-800/30 px-4 py-2.5
                           text-slate-400 text-sm font-medium transition-all
                           hover:border-slate-500 hover:text-slate-200 active:scale-[0.98]"
              >
                <RotateCcw className="w-4 h-4" />
                강화 초기화
                <span className="text-amber-300/70 text-xs font-mono">
                  (환불 +{refundAmount} G{refundStars > 0 ? ` +${refundStars} 별` : ""})
                </span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Reset confirmation modal */}
      {showReset && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          onClick={() => setShowReset(false)}
        >
          <div
            className="rounded-2xl border-2 border-slate-700 bg-slate-900 p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-slate-300" />
                <h3 className="text-slate-100 font-bold text-lg">강화 초기화</h3>
              </div>
              <button
                onClick={() => setShowReset(false)}
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed mb-1">
              {def?.name}의 레벨과 각성을 초기화합니다.
            </p>
            <p className="text-slate-400 text-sm leading-relaxed mb-4">
              사용한 골드와 별을 전액 환불받습니다.
            </p>
            <div className="rounded-lg bg-slate-800/60 px-4 py-3 mb-5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 text-sm">골드 환불</span>
                <span className="text-amber-300 font-mono font-bold flex items-center gap-1">
                  +{refundAmount} G
                </span>
              </div>
              {refundStars > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 text-sm">별 환불</span>
                  <span className="text-cyan-300 font-mono font-bold flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-cyan-400 text-cyan-400" />
                    +{refundStars}
                  </span>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowReset(false)}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-2.5
                           text-slate-300 text-sm font-semibold transition-all
                           hover:bg-slate-700/60 active:scale-95"
              >
                취소
              </button>
              <button
                onClick={handleReset}
                className="flex-1 rounded-lg bg-amber-500 px-4 py-2.5
                           text-slate-900 text-sm font-bold transition-all
                           hover:bg-amber-400 active:scale-95"
              >
                초기화
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatBar({ label, value, display }: { label: string; value: number; display: string }) {
  const pct = Math.min(100, (value / 2) * 100);
  const color = value >= 1.2 ? "#22c55e" : value >= 0.9 ? "#eab308" : "#ef4444";
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-slate-400 text-xs">{label}</span>
        <span className="text-slate-200 text-xs font-mono font-semibold">{display}</span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

const PASSIVE_ENHANCEMENTS: Record<string, { before: string; after: string }> = {
  extraReroll: {
    before: "레벨업마다 리롤 +1회",
    after: "레벨업마다 리롤 +3회 (+2 추가)",
  },
  lowHpFury: {
    before: "체력이 낮을수록 공격력 증가 (최대 +50%)",
    after: "체력이 낮을수록 공격력 증가 (최대 +80%)",
  },
  guardianWall: {
    before: "받는 피해 15% 감소 · 근접 적에게 반사 피해 3",
    after: "받는 피해 25% 감소 · 근접 적에게 반사 피해 6",
  },
  swiftLooter: {
    before: "이동속도의 30%만큼 추가 공격력 · 흡수 범위 +20%",
    after: "이동속도의 30%만큼 추가 공격력 · 흡수 범위 +40%",
  },
  spellPower: {
    before: "모든 공격 피해 +15%",
    after: "모든 공격 피해 +25%",
  },
  critStrike: {
    before: "15% 확률로 치명타 (2배 피해)",
    after: "25% 확률로 치명타 (2배 피해)",
  },
  none: {
    before: "고유 특성 없음",
    after: "고유 특성 없음",
  },
};

function BreakthroughDesc({
  tier,
  current,
  def,
}: {
  tier: number;
  current: number;
  def?: CharacterDef;
}) {
  const achieved = current >= tier;
  const passiveKey = def?.passive ?? "none";
  const enhance = PASSIVE_ENHANCEMENTS[passiveKey] ?? PASSIVE_ENHANCEMENTS.none;

  let desc: string;
  if (tier === 1) {
    desc = "1돌파: 체력 +10% · 공격력 +5% · 이동속도 +5%";
  } else if (tier === 2) {
    desc = "2돌파: 경험치 획득 +30% · 흡수 범위 +30%";
  } else if (tier === 3) {
    desc = `3돌파: 고유 특성 강화 — ${enhance.before} → ${enhance.after}`;
  } else if (tier === 4 && def) {
    desc = `4돌파: 게임 시작 시 진화 짝 장신구 획득 (${accessoryName(EVOLUTIONS[def.startWeapon].pairedAccessory)})`;
  } else {
    desc = "4돌파: 게임 시작 시 진화 짝 장신구 획득";
  }

  return (
    <div
      className={`flex items-start gap-2 rounded-lg px-3 py-1.5 text-xs ${
        achieved
          ? "bg-violet-900/30 border border-violet-700/30"
          : "bg-slate-800/30 border border-slate-700/30"
      }`}
    >
      {achieved ? (
        <Check className="w-3.5 h-3.5 text-violet-400 flex-shrink-0 mt-0.5" />
      ) : (
        <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-600 flex-shrink-0 mt-0.5" />
      )}
      <span className={achieved ? "text-violet-300" : "text-slate-400"}>
        {desc}
      </span>
    </div>
  );
}
