import { useState } from "react";
import { ArrowLeft, Skull, Sword, ChevronRight, ChevronLeft, Sparkles, Flame, Gem } from "lucide-react";
import { CONFIG } from "@/game/data/config";
import { allWeaponTypes, weaponName, weaponDesc, weaponMaxLevel } from "@/game/systems/WeaponManager";
import { allAccessoryTypes, accessoryName, accessoryDesc, accessoryMaxLevel } from "@/game/systems/AccessoryManager";
import { EVOLUTIONS, SUPER_EVOLUTIONS } from "@/game/data/evolutions";
import { CHARACTERS } from "@/game/data/progression";
import { bulletBurstCount, bulletBurstPause } from "@/game/weapons/BulletWeapon";
import { weaponLevelEffectAt } from "@/game/weapons/registry";
import { accessoryColor, weaponColor } from "@/ui/theme";
import { GameIcon } from "@/ui/components/GameIcon";
import { EnemyShape } from "@/ui/components/EnemyShape";
import { PixelFace, PixelWalker } from "@/ui/components/PixelSprite";
import { accessoryIconName, weaponIcon } from "@/ui/icons";
import type { WeaponType, WeaponInstance, AccessoryType } from "@/game/core/types";

type Category = "enemies" | "weapons" | "evolutions" | "accessories";

interface EnemyInfo {
  id: string;
  name: string;
  color: string;
  borderColor: string;
  desc: string;
  hp: number;
  speed: number;
  damage: number;
  radius: number;
  shape: "circle" | "triangle" | "square" | "diamond" | "hexagon" | "star" | "sprite";
  unlockedTime: number;
}

const ENEMY_DESCS: Record<string, string> = {
  slime: "가장 기본적인 적. 느리지만 꾸준히 몰려옵니다. 게임 시작부터 등장합니다.",
  bat: "빠른 속도로 돌진하는 작은 박쥐. 체력은 낮지만 피하기 어렵습니다. 30초 후부터 등장합니다.",
  skeleton: "단단한 뼈로 이루어져 체력이 높습니다. 느리지만 한 방이 아프습니다. 60초 후부터 등장합니다.",
  ghost: "푸른 빛을 띤 유령. 균형 잡힌 스탯으로 까다롭습니다. 90초 후부터 등장합니다.",
  brute: "거대한 체구와 막강한 체력을 가진 브루트. 느리지만 절대 얕보지 마세요. 120초 후부터 등장합니다.",
  wraith: "매우 빠르고 강한 래쓰. 180초 후부터 등장하는 최위험 적입니다.",
  wolf: "스프라이트로 표현된 날렵한 늑대. 빠르고 강력한 근접 공격으로 위협합니다. 150초 후부터 등장합니다.",
};

const ENEMY_INFOS: EnemyInfo[] = CONFIG.enemyTypes.map((t) => ({
  id: t.id,
  name: t.name,
  color: t.color,
  borderColor: t.borderColor,
  desc: ENEMY_DESCS[t.id] ?? "",
  hp: t.hp,
  speed: t.speed,
  damage: t.damage,
  radius: t.radius,
  shape: t.shape,
  unlockedTime: t.unlockedTime,
}));

export function CodexScreen({ onBack }: CodexScreenProps) {
  const [category, setCategory] = useState<Category>("enemies");
  const [selectedEnemy, setSelectedEnemy] = useState<EnemyInfo | null>(null);
  const [selectedWeapon, setSelectedWeapon] = useState<WeaponType | null>(null);
  const [selectedEvolution, setSelectedEvolution] = useState<WeaponType | null>(null);
  const [selectedAccessory, setSelectedAccessory] = useState<AccessoryType | null>(null);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">로비로</span>
          </button>
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-950/40 border-2 border-emerald-500/30 mb-3">
            <GameIcon name="menu-codex" size={30} className="text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">도감</h1>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 mb-6">
          <CategoryTab
            active={category === "enemies"}
            onClick={() => { setCategory("enemies"); setSelectedEnemy(null); setSelectedWeapon(null); setSelectedAccessory(null); }}
            icon={<Skull className="w-4 h-4" />}
            label="적"
          />
          <CategoryTab
            active={category === "weapons"}
            onClick={() => { setCategory("weapons"); setSelectedEnemy(null); setSelectedWeapon(null); setSelectedEvolution(null); setSelectedAccessory(null); }}
            icon={<Sword className="w-4 h-4" />}
            label="무기"
          />
          <CategoryTab
            active={category === "evolutions"}
            onClick={() => { setCategory("evolutions"); setSelectedEnemy(null); setSelectedWeapon(null); setSelectedEvolution(null); setSelectedAccessory(null); }}
            icon={<Flame className="w-4 h-4" />}
            label="진화"
          />
          <CategoryTab
            active={category === "accessories"}
            onClick={() => { setCategory("accessories"); setSelectedEnemy(null); setSelectedWeapon(null); setSelectedEvolution(null); setSelectedAccessory(null); }}
            icon={<Gem className="w-4 h-4" />}
            label="장신구"
          />
        </div>

        {/* Enemy category */}
        {category === "enemies" && !selectedEnemy && (
          <div className="grid grid-cols-1 gap-3">
            {ENEMY_INFOS.map((enemy) => (
              <button
                key={enemy.id}
                onClick={() => setSelectedEnemy(enemy)}
                className="flex items-center gap-4 rounded-xl border-2 border-slate-700 bg-slate-900/40 px-5 py-4
                           transition-all hover:border-slate-500 active:scale-[0.98] text-left"
              >
                <div
                  className="relative flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden"
                  style={{ backgroundColor: enemy.color + "22", border: `2px solid ${enemy.color}` }}
                >
                  {enemy.shape === "sprite" ? (
                    <img src="/assets/enemy/Wolf.png" alt={enemy.name}
                      className="absolute left-0 top-0 max-w-none"
                      style={{ width: "400%", height: "1400%", imageRendering: "pixelated" }}
                    />
                  ) : (
                    <PixelFace kind="enemy" id={enemy.id} size={44} color={enemy.color} />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="flex items-center gap-2 text-slate-100 font-bold text-sm">
                    {enemy.name}
                  </h3>
                  <p className="text-slate-500 text-xs mt-0.5 line-clamp-1">{enemy.desc}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-600" />
              </button>
            ))}
          </div>
        )}

        {category === "enemies" && selectedEnemy && (
          <EnemyDetail enemy={selectedEnemy} onBack={() => setSelectedEnemy(null)} />
        )}

        {/* Weapon category */}
        {category === "weapons" && !selectedWeapon && (
          <div className="grid grid-cols-1 gap-3">
            {allWeaponTypes().map((type) => {
              const wcfg = CONFIG.weapons[type];
              return (
                <button
                  key={type}
                  onClick={() => setSelectedWeapon(type)}
                  className="flex items-center gap-4 rounded-xl border-2 border-slate-700 bg-slate-900/40 px-5 py-4
                             transition-all hover:border-slate-500 active:scale-[0.98] text-left"
                >
                  <div
                    className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: wcfg.color + "22", border: `2px solid ${wcfg.color}` }}
                  >
                    <GameIcon name={weaponIcon(type)} size={28} color={wcfg.color} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-slate-100 font-bold text-sm">{wcfg.name}</h3>
                    <p className="text-slate-500 text-xs mt-0.5 line-clamp-1">{wcfg.desc}</p>
                  </div>
                  <span className="text-slate-600 text-xs font-mono">Lv 1-{wcfg.maxLevel}</span>
                  <ChevronRight className="w-5 h-5 text-slate-600" />
                </button>
              );
            })}
          </div>
        )}

        {category === "weapons" && selectedWeapon && (
          <WeaponDetail type={selectedWeapon} onBack={() => setSelectedWeapon(null)} />
        )}

        {/* Evolution category */}
        {category === "evolutions" && !selectedEvolution && (
          <div className="grid grid-cols-1 gap-3">
            {allWeaponTypes().map((type) => {
              const evo = EVOLUTIONS[type];
              return (
                <button
                  key={type}
                  onClick={() => setSelectedEvolution(type)}
                  className="flex items-center gap-4 rounded-xl border-2 border-amber-900/40 bg-gradient-to-r from-amber-950/30 to-slate-900/40 px-5 py-4
                             transition-all hover:border-amber-600/60 active:scale-[0.98] text-left"
                >
                  <div
                    className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: "#f59e0b22", border: `2px solid #f59e0b` }}
                  >
                    <GameIcon name={weaponIcon(type, true)} size={30} color={weaponColor(type)} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-amber-200 font-bold text-sm">{evo.evolvedName}</h3>
                    <p className="text-slate-400 text-xs mt-0.5 line-clamp-1">
                      {weaponName(type)} 진화 · {evo.desc}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-amber-700" />
                </button>
              );
            })}
          </div>
        )}

        {category === "evolutions" && selectedEvolution && (
          <EvolutionDetail type={selectedEvolution} onBack={() => setSelectedEvolution(null)} />
        )}

        {/* Accessory category */}
        {category === "accessories" && !selectedAccessory && (
          <div className="grid grid-cols-1 gap-3">
            {allAccessoryTypes().map((type) => {
              const def = CONFIG.accessories[type];
              const color = accessoryColor(type);
              return (
                <button
                  key={type}
                  onClick={() => setSelectedAccessory(type)}
                  className="flex items-center gap-4 rounded-xl border-2 border-slate-700 bg-slate-900/40 px-5 py-4
                             transition-all hover:border-slate-500 active:scale-[0.98] text-left"
                >
                  <div
                    className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: color + "22", border: `2px solid ${color}` }}
                  >
                    <GameIcon name={accessoryIconName(type)} size={28} color={color} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-slate-100 font-bold text-sm">{accessoryName(type)}</h3>
                    <p className="text-slate-500 text-xs mt-0.5 line-clamp-1">{accessoryDesc(type)}</p>
                  </div>
                  <span className="text-slate-600 text-xs font-mono">Lv 1-{def.maxLevel}</span>
                  <ChevronRight className="w-5 h-5 text-slate-600" />
                </button>
              );
            })}
          </div>
        )}

        {category === "accessories" && selectedAccessory && (
          <AccessoryDetail type={selectedAccessory} onBack={() => setSelectedAccessory(null)} />
        )}
      </div>
    </div>
  );
}

function getWeaponLevelEffect(type: WeaponType, level: number): string | null {
  const mockW: WeaponInstance = { type, level, cooldownTimer: 0, burstShotsLeft: 0, burstTimer: 0, evolved: false, super: false };
  return weaponLevelEffectAt(mockW, level);
}

// ---- Enemy detail ----
function EnemyDetail({ enemy, onBack }: { enemy: EnemyInfo; onBack: () => void }) {
  return (
    <div className="rounded-2xl border-2 border-slate-700 bg-slate-900/40 p-6">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-slate-400 hover:text-slate-100 transition-colors mb-4 text-sm"
      >
        <ChevronLeft className="w-4 h-4" /> 목록으로
      </button>

      <div className="flex items-start gap-5 mb-5">
        <div
          className="relative flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden"
          style={{ backgroundColor: enemy.color + "22", border: `2px solid ${enemy.color}` }}
        >
          {enemy.shape === "sprite" ? (
            <img src="/assets/enemy/Wolf.png" alt={enemy.name}
              className="absolute left-0 top-0 max-w-none"
              style={{ width: "400%", height: "1400%", imageRendering: "pixelated" }}
            />
          ) : (
            <PixelFace kind="enemy" id={enemy.id} size={60} color={enemy.color} />
          )}
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-slate-100">{enemy.name}</h2>
          <p className="text-slate-400 text-sm mt-1 leading-relaxed">{enemy.desc}</p>
        </div>
        {enemy.shape !== "sprite" && (
          <div className="flex gap-2">
            <div className="flex flex-col items-center gap-1 rounded-xl border border-slate-700/60 bg-[#2f4a1f] px-3 py-2">
              <PixelWalker kind="enemy" id={enemy.id} size={44} />
              <span className="text-[10px] text-slate-300">게임 내 모습</span>
            </div>
            <div className="flex flex-col items-center justify-between gap-1 rounded-xl border border-slate-700/60 bg-[#0a0a12] px-3 py-2">
              <EnemyShape shape={enemy.shape} color={enemy.color} borderColor={enemy.borderColor} size={36} />
              <span className="text-[10px] text-slate-500">저사양 모드</span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <SpecCard label="체력" value={`${enemy.hp}`} color="text-red-300" />
        <SpecCard label="이동 속도" value={`${enemy.speed}`} color="text-cyan-300" />
        <SpecCard label="접촉 피해" value={`${enemy.damage}`} color="text-orange-300" />
        <SpecCard label="크기" value={`${enemy.radius}px`} color="text-slate-300" />
      </div>

      <div className="mt-4 rounded-lg bg-slate-800/40 border border-slate-700/50 px-4 py-3">
        <p className="text-slate-400 text-xs leading-relaxed">
          등장 시간: {Math.floor(enemy.unlockedTime / 60)}분 {enemy.unlockedTime % 60}초 이후
          <br />
          스폰 간격: {CONFIG.enemy.spawnInterval}초에서 시작. 처음 1분은 초당 ×{CONFIG.enemy.spawnDecayPerSecond}, 이후 분당 ×{CONFIG.enemy.spawnDecayPerMinute}
          <br />
          동시 최대 수: {CONFIG.enemy.maxCount}마리에서 시작, 분당 100%p씩 증가
          <br />
          접촉 피해 쿨다운: {CONFIG.enemy.contactDamageCooldown}초
        </p>
      </div>
    </div>
  );
}

// ---- Weapon detail ----
function WeaponDetail({ type, onBack }: { type: WeaponType; onBack: () => void }) {
  const wcfg = CONFIG.weapons[type];
  const maxLv = weaponMaxLevel(type);

  // Compute per-level stats
  const levels = Array.from({ length: maxLv }, (_, i) => i + 1);
  const getDamage = (lv: number) => {
    const base = wcfg.baseDamage;
    const growth = wcfg.damageGrowth as number;
    return Math.round(base * Math.pow(growth, lv - 1));
  };
  const getCooldown = (lv: number) => {
    if (type === "bullet") {
      const mockW: WeaponInstance = { type, level: lv, cooldownTimer: 0, burstShotsLeft: 0, burstTimer: 0, evolved: false, super: false };
      return `${bulletBurstCount(mockW)}연사 / ${bulletBurstPause(mockW).toFixed(2)}초`;
    }
    const cfg = wcfg as { baseCooldown: number; cooldownGrowth: number };
    if (cfg.baseCooldown === 0) return null;
    return (cfg.baseCooldown * Math.pow(cfg.cooldownGrowth, lv - 1)).toFixed(2);
  };

  return (
    <div className="rounded-2xl border-2 border-slate-700 bg-slate-900/40 p-6">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-slate-400 hover:text-slate-100 transition-colors mb-4 text-sm"
      >
        <ChevronLeft className="w-4 h-4" /> 목록으로
      </button>

      <div className="flex items-start gap-5 mb-5">
        <div
          className="flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: wcfg.color + "22", border: `2px solid ${wcfg.color}` }}
        >
          <GameIcon name={weaponIcon(type)} size={40} color={wcfg.color} />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-slate-100">{weaponName(type)}</h2>
          <p className="text-slate-400 text-sm mt-1">{weaponDesc(type)}</p>
        </div>
      </div>

      {/* Base stats */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <SpecCard label="기본 대미지" value={`${wcfg.baseDamage}`} color="text-red-300" />
        {type === "bullet" ? (
          <SpecCard label="버스트 패턴" value={`${CONFIG.weapons.bullet.baseBurstCount}연사`} color="text-cyan-300" />
        ) : type === "claw" ? (
          <SpecCard label="기본 반경" value={`${CONFIG.weapons.claw.baseRadius}px`} color="text-lime-300" />
        ) : (wcfg as { baseCooldown: number }).baseCooldown > 0 ? (
          <SpecCard label="기본 쿨다운" value={`${(wcfg as { baseCooldown: number }).baseCooldown}초`} color="text-cyan-300" />
        ) : (
          <SpecCard label="쿨다운" value="연속" color="text-emerald-300" />
        )}
        <SpecCard label="최대 레벨" value={`${maxLv}`} color="text-amber-300" />
        <SpecCard label="대미지 성장" value={`x${wcfg.damageGrowth}`} color="text-orange-300" />
      </div>

      {/* Weapon-specific stats */}
      <div className="rounded-lg bg-slate-800/40 border border-slate-700/50 px-4 py-3 mb-5">
        <p className="text-slate-400 text-xs leading-relaxed">
          {type === "bullet" && (
            <>
              버스트 발사 수: {CONFIG.weapons.bullet.baseBurstCount} · 발사 간격: {CONFIG.weapons.bullet.baseBurstInterval}초
              <br />
              버스트 대기 시간: {CONFIG.weapons.bullet.baseBurstPause}초 · 관통: {CONFIG.weapons.bullet.basePierce} · 사거리: {CONFIG.weapons.bullet.range}
            </>
          )}
          {type === "melee" && (
            <>
              회전 반경: {CONFIG.weapons.melee.baseBladeRadius}px · 칼날 크기: {CONFIG.weapons.melee.baseBladeSize}px
              <br />
              기본 칼날 수: {CONFIG.weapons.melee.baseBladeCount} · 재타격 쿨다운: {CONFIG.weapons.melee.hitCooldown}초
            </>
          )}
          {type === "bomb" && (
            <>
              폭발 반경: {CONFIG.weapons.bomb.baseExplosionRadius}px · 낙하 시간: {CONFIG.weapons.bomb.baseFallTime}초
            </>
          )}
          {type === "trap" && (
            <>
              트랩 반경: {CONFIG.weapons.trap.baseTrapRadius}px · 지속 시간: {CONFIG.weapons.trap.baseTrapLifetime}초
              <br />
              최대 트랩 수: {CONFIG.weapons.trap.baseMaxTraps} · 재타격 쿨다운: {CONFIG.weapons.trap.hitCooldown}초
            </>
          )}
          {type === "aura" && (
            <>
              오오라 반경: {CONFIG.weapons.aura.baseAuraRadius}px · 틱 간격: {CONFIG.weapons.aura.tickInterval}초
            </>
          )}
          {type === "shuriken" && (
            <>
              투사체 속도: {CONFIG.weapons.shuriken.baseProjectileSpeed} · 관통: {CONFIG.weapons.shuriken.basePierce} · 사거리: {CONFIG.weapons.shuriken.baseRange}
              <br />
              투사체 크기: {CONFIG.weapons.shuriken.baseProjectileRadius}px
            </>
          )}
          {type === "claw" && (
            <>
              공격 반경: {CONFIG.weapons.claw.baseRadius}px · 기본 베기 수: {CONFIG.weapons.claw.baseSlashCount}
              <br />
              쿨다운: {CONFIG.weapons.claw.baseCooldown}초 · 진화 시 출혈 지속 데미지 추가
            </>
          )}
        </p>
      </div>

      {/* Level scaling table */}
      <div>
        <h3 className="text-slate-300 text-sm font-semibold mb-3">레벨별 스펙</h3>
        <div className="overflow-hidden rounded-lg border border-slate-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800/60 text-slate-400 text-xs">
                <th className="px-3 py-2 text-left font-semibold">레벨</th>
                <th className="px-3 py-2 text-right font-semibold">대미지</th>
                <th className="px-3 py-2 text-right font-semibold">쿨다운</th>
                <th className="px-3 py-2 text-left font-semibold">특수 효과</th>
              </tr>
            </thead>
            <tbody>
              {levels.map((lv) => {
                const effect = getWeaponLevelEffect(type, lv);
                return (
                  <tr
                    key={lv}
                    className={`border-t border-slate-800 text-slate-300 ${lv === 1 ? "bg-slate-900/30" : ""}`}
                  >
                    <td className="px-3 py-2 text-left font-mono">
                      <span className={lv === 1 ? "text-slate-500" : "text-cyan-300"}>Lv {lv}</span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-red-300">{getDamage(lv)}</td>
                    <td className="px-3 py-2 text-right font-mono text-cyan-300">
                      {getCooldown(lv) ? (type === "bullet" ? getCooldown(lv) : `${getCooldown(lv)}초`) : "연속"}
                    </td>
                    <td className="px-3 py-2 text-left">
                      {effect ? (
                        <span className="inline-flex items-center gap-1 text-cyan-400 text-xs font-semibold">
                          <Sparkles className="w-3 h-3 flex-shrink-0" />
                          {effect}
                        </span>
                      ) : (
                        <span className="text-slate-600 text-xs">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---- Evolution detail ----
function EvolutionDetail({ type, onBack }: { type: WeaponType; onBack: () => void }) {
  const evo = EVOLUTIONS[type];
  const wcfg = CONFIG.weapons[type];

  return (
    <div className="rounded-2xl border-2 border-amber-900/50 bg-gradient-to-br from-amber-950/30 via-slate-900/50 to-slate-900/40 p-6">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-slate-400 hover:text-slate-100 transition-colors mb-4 text-sm"
      >
        <ChevronLeft className="w-4 h-4" /> 목록으로
      </button>

      <div className="flex items-start gap-5 mb-5">
        <div
          className="flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: "#f59e0b22", border: `2px solid #f59e0b` }}
        >
          <GameIcon name={weaponIcon(type, true)} size={40} color={weaponColor(type)} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-amber-500 bg-amber-950/40 border border-amber-800/40 rounded px-2 py-0.5">
              {weaponName(type)} 진화
            </span>
          </div>
          <h2 className="text-xl font-bold text-amber-200">{evo.evolvedName}</h2>
          <p className="text-slate-300 text-sm mt-1">{evo.desc}</p>
          {SUPER_EVOLUTIONS.filter((s) => s.weapon === type).map((s) => {
            const who = CHARACTERS.find((c) => c.id === s.characterId)?.name ?? s.characterId;
            return (
              <p key={s.characterId} className="text-fuchsia-300 text-sm mt-2">
                초진화 ({who}): {s.name} — {s.desc}
              </p>
            );
          })}
        </div>
      </div>

      {/* Evolution conditions */}
      <div className="rounded-lg bg-slate-800/40 border border-slate-700/50 px-4 py-3 mb-5">
        <p className="text-slate-400 text-xs leading-relaxed">
          진화 조건: 무기 <span className="text-cyan-300 font-semibold">Lv8 달성</span> + 장신구{" "}
          <span className="text-violet-300 font-semibold">{accessoryName(evo.pairedAccessory)}</span> 보유
          <br />
          진화 시 무기는 <span className="text-amber-300 font-semibold">최종 형태</span>로 고정되며 더 이상 레벨업할 수 없습니다.
          {SUPER_EVOLUTIONS.some((s) => s.weapon === type) && (
            <>
              <br />
              해당 시작 무기를 가진 스페셜 캐릭터만 위의 초진화로 바뀝니다.
            </>
          )}
        </p>
      </div>

      {/* Stat changes */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <SpecCard
          label="진화 대미지"
          value={`${Math.round(
            wcfg.baseDamage * Math.pow(wcfg.damageGrowth as number, 7) * evo.damageMult
          )}`}
          color="text-red-300"
        />
        <SpecCard
          label="진화 쿨다운"
          value={
            type === "bullet"
              ? "버스트"
              : type === "melee" || type === "aura"
                ? "연속"
                : `${(
                    (wcfg as { baseCooldown: number; cooldownGrowth: number }).baseCooldown *
                    Math.pow((wcfg as { cooldownGrowth: number }).cooldownGrowth, 7) *
                    evo.cooldownMult
                  ).toFixed(2)}초`
          }
          color="text-cyan-300"
        />
        <SpecCard
          label="기본 무기"
          value={weaponName(type)}
          color="text-slate-200"
        />
        <SpecCard
          label="쌍 장신구"
          value={accessoryName(evo.pairedAccessory)}
          color="text-violet-300"
        />
      </div>

      {/* Effect */}
      <div>
        <h3 className="text-slate-300 text-sm font-semibold mb-3">진화 효과</h3>
        <div className="rounded-lg bg-amber-950/20 border border-amber-800/30 px-4 py-3">
          <p className="text-amber-200 text-sm leading-relaxed">{evo.desc}</p>
          <p className="text-slate-400 text-xs mt-2 leading-relaxed">
            기본 무기 색상: <span style={{ color: wcfg.color }}>{wcfg.color}</span>
            <br />
            효과 코드: <code className="text-slate-500">{evo.effect}</code>
          </p>
        </div>
      </div>
    </div>
  );
}

// ---- Accessory detail ----
function AccessoryDetail({ type, onBack }: { type: AccessoryType; onBack: () => void }) {
  const def = CONFIG.accessories[type];
  const maxLv = accessoryMaxLevel(type);
  const color = accessoryColor(type);

  const levels = Array.from({ length: maxLv }, (_, i) => i + 1);

  const getEffectText = (lv: number): string => {
    switch (type) {
      case "swiftBoots":
        return `이속 +${Math.round((def.baseMoveSpeedMult! + def.growthMoveSpeedMult! * (lv - 1)) * 100 - 100)}%`;
      case "vitalRing":
        return `체력 +${def.baseMaxHpAdd! + def.growthMaxHpAdd! * (lv - 1)}`;
      case "magnetCharm":
        return `흡수 +${Math.round((def.basePickupMult! + def.growthPickupMult! * (lv - 1)) * 100 - 100)}%`;
      case "powerAmulet":
        return `공격력 +${Math.round((def.baseDamageMult! + def.growthDamageMult! * (lv - 1)) * 100 - 100)}%`;
      case "hastePendant":
        return `쿨다운 -${Math.round((1 - (def.baseCooldownMult! + def.growthCooldownMult! * (lv - 1))) * 100)}%`;
      case "xpcrystal":
        return `경험치 +${Math.round((def.baseXpMult! + def.growthXpMult! * (lv - 1)) * 100 - 100)}%`;
      case "thornArmor":
        return `반사 ${def.baseReflectDamage! + def.growthReflectDamage! * (lv - 1)} 데미지`;
      case "shieldForge":
        return `피해감소 ${Math.round((def.baseDamageReduction! + def.growthDamageReduction! * (lv - 1)) * 100)}%`;
      case "natureBlessing":
        return `체력재생 ${(def.baseRegenPerSec! + def.growthRegen! * (lv - 1)).toFixed(1)}/s`;
      default:
        return "-";
    }
  };

  return (
    <div className="rounded-2xl border-2 border-slate-700 bg-slate-900/40 p-6">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-slate-400 hover:text-slate-100 transition-colors mb-4 text-sm"
      >
        <ChevronLeft className="w-4 h-4" /> 목록으로
      </button>

      <div className="flex items-start gap-5 mb-5">
        <div
          className="flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: color + "22", border: `2px solid ${color}` }}
        >
          <GameIcon name={accessoryIconName(type)} size={40} color={color} />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-slate-100">{accessoryName(type)}</h2>
          <p className="text-slate-400 text-sm mt-1">{accessoryDesc(type)}</p>
        </div>
      </div>

      {/* Base stats */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <SpecCard label="최대 레벨" value={`${maxLv}`} color="text-amber-300" />
        <SpecCard label="효과" value={getEffectText(1)} color="text-violet-300" />
      </div>

      {/* Description */}
      <div className="rounded-lg bg-slate-800/40 border border-slate-700/50 px-4 py-3 mb-5">
        <p className="text-slate-400 text-xs leading-relaxed">
          장신구는 레벨업 시 획득 또는 강화할 수 있는 패시브 아이템입니다.
          <br />
          최대 {CONFIG.maxAccessories}개까지 동시 장착 가능하며, 효과가 중첩됩니다.
        </p>
      </div>

      {/* Level scaling table */}
      <div>
        <h3 className="text-slate-300 text-sm font-semibold mb-3">레벨별 효과</h3>
        <div className="overflow-hidden rounded-lg border border-slate-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800/60 text-slate-400 text-xs">
                <th className="px-3 py-2 text-left font-semibold">레벨</th>
                <th className="px-3 py-2 text-left font-semibold">효과</th>
              </tr>
            </thead>
            <tbody>
              {levels.map((lv) => (
                <tr
                  key={lv}
                  className={`border-t border-slate-800 text-slate-300 ${lv === 1 ? "bg-slate-900/30" : ""}`}
                >
                  <td className="px-3 py-2 text-left font-mono">
                    <span className={lv === 1 ? "text-slate-500" : "text-violet-300"}>Lv {lv}</span>
                  </td>
                  <td className="px-3 py-2 text-left">
                    <span className="inline-flex items-center gap-1 text-violet-400 text-xs font-semibold">
                      <Sparkles className="w-3 h-3 flex-shrink-0" />
                      {getEffectText(lv)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---- Shared components ----
function CategoryTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-all active:scale-95
        ${active
          ? "bg-emerald-600 text-white"
          : "bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-700/60"
        }`}
    >
      {icon}
      {label}
    </button>
  );
}

function SpecCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg bg-slate-800/40 border border-slate-700/50 px-4 py-3 flex items-center justify-between">
      <span className="text-slate-400 text-xs">{label}</span>
      <span className={`text-sm font-mono font-bold ${color}`}>{value}</span>
    </div>
  );
}

interface CodexScreenProps {
  onBack: () => void;
}
