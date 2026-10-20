import { useEffect, useRef, useState, useCallback } from "react";
import { Pause, Play, Flag } from "lucide-react";
import { GameEngine } from "@/game/core/GameEngine";
import { CONFIG } from "@/game/data/config";
import type { GameStats, UpgradeOption, WeaponType } from "@/game/core/types";
import { HUD } from "@/ui/components/HUD";
import { UpgradeModal } from "@/ui/components/UpgradeModal";
import { SettingsPanel } from "@/ui/components/SettingsPanel";
import { GameIcon } from "@/ui/components/GameIcon";
import type { SaveData } from "@/game/core/storage";
import { saveSave } from "@/game/core/storage";
import { ACHIEVEMENTS, CHARACTERS, type AchievementDef } from "@/game/data/progression";
import { constraintGoldMultiplier, constraintScore } from "@/game/data/constraints";
import { weaponName } from "@/game/systems/WeaponManager";
import { UI_ICONS, weaponIcon } from "@/ui/icons";
import { weaponColor } from "@/ui/theme";

// playing → levelup (engine paused for a pick) → playing
// playing ⇄ paused (ESC / P / focus loss)
// any → gameover
type Phase = "playing" | "levelup" | "paused" | "gameover";

function scoreToGold(score: number): number {
  return Math.floor(score / 10);
}

function formatTime(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;
}

/** 엔진이 첫 통계를 보내기 전(≈0.15초) HUD에 표시할 값 — 선택 캐릭터의 시작 무기를 반영 */
function initialStats(save: SaveData): GameStats {
  const startWeapon = (CHARACTERS.find((c) => c.id === save.selectedCharacter)?.startWeapon ??
    "bullet") as WeaponType;
  return {
    time: 0,
    kills: 0,
    level: 1,
    xp: 0,
    xpToNext: CONFIG.leveling.baseXpToNext,
    hp: CONFIG.player.maxHp,
    maxHp: CONFIG.player.maxHp,
    alive: true,
    score: 0,
    weapons: [{ type: startWeapon, name: weaponName(startWeapon), level: 1, evolved: false }],
    accessories: [],
    rerolls: 0,
    eliteSeconds: null,
    failedElite: false,
  };
}

/** 캔버스 비율(4:3)을 유지하면서 가로·세로 모두 화면 안에 들어오는 폭 (하단 안내줄 여백 96px) */
const CANVAS_FIT_WIDTH = `min(${CONFIG.canvasWidth}px, 100%, calc((100vh - 96px) * ${
  CONFIG.canvasWidth / CONFIG.canvasHeight
}))`;

const MOVE_KEYS = ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"];

export function GameCanvas({ onExit, save }: { onExit: () => void; save: SaveData }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const saveRef = useRef<SaveData>(save);
  const phaseRef = useRef<Phase>("playing");
  const [stats, setStats] = useState<GameStats>(() => initialStats(save));
  const [phase, setPhaseState] = useState<Phase>("playing");
  const [upgradeOptions, setUpgradeOptions] = useState<UpgradeOption[]>([]);
  const [pendingAfter, setPendingAfter] = useState(0);
  const [goldEarned, setGoldEarned] = useState(0);
  const [constraintBonus, setConstraintBonus] = useState({ score: 0, multiplier: 1 });
  const [newAchievements, setNewAchievements] = useState<AchievementDef[]>([]);

  // Keep a ref in sync so window listeners always see the current phase
  const setPhase = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  }, []);

  // Init engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // alpha:false — 매 프레임 배경을 불투명하게 칠하므로 합성 비용을 줄인다 (MDN 권장)
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const engine = new GameEngine(ctx, {
      onStatsUpdate: (s) => setStats(s),
      onLevelUp: (opts) => {
        setUpgradeOptions(opts);
        setPendingAfter(engine.getPendingLevelUps());
        setPhase("levelup");
      },
      onGameOver: (s) => {
        setStats(s);
        const score = constraintScore(saveRef.current.constraintLevels);
        const multiplier = constraintGoldMultiplier(score);
        const earned = Math.floor(scoreToGold(s.score) * multiplier);
        setGoldEarned(earned);
        setConstraintBonus({ score, multiplier });

        // Achievements: weapon evolved during this run
        const alreadyCompleted = new Set(saveRef.current.completedAchievements);
        const unlocked: AchievementDef[] = [];
        for (const ach of ACHIEVEMENTS) {
          if (alreadyCompleted.has(ach.id)) continue;
          const weaponType = ach.id.replace("evo_", "");
          const weapon = s.weapons.find((w) => w.type === weaponType);
          if (weapon && weapon.evolved) unlocked.push(ach);
        }
        const starsEarned = unlocked.reduce((sum, a) => sum + a.reward, 0);

        const nextSave: SaveData = {
          ...saveRef.current,
          gold: saveRef.current.gold + earned,
          stars: saveRef.current.stars + starsEarned,
          completedAchievements: [...saveRef.current.completedAchievements, ...unlocked.map((a) => a.id)],
        };
        saveRef.current = nextSave;
        saveSave(nextSave);
        setNewAchievements(unlocked);
        setPhase("gameover");
      },
    }, saveRef.current);
    engineRef.current = engine;
    engine.start();

    return () => engine.stop();
  }, [setPhase]);

  const pauseGame = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    engineRef.current?.setUserPaused(true);
    setPhase("paused");
  }, [setPhase]);

  const resumeGame = useCallback(() => {
    if (phaseRef.current !== "paused") return;
    engineRef.current?.setUserPaused(false);
    setPhase("playing");
  }, [setPhase]);

  // Keyboard: movement + ESC/P pause toggle
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (MOVE_KEYS.includes(key)) {
        e.preventDefault();
        engineRef.current?.setInput(key, true);
      } else if ((key === "escape" || key === "p") && !e.repeat) {
        e.preventDefault();
        if (phaseRef.current === "playing") pauseGame();
        else if (phaseRef.current === "paused") resumeGame();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (MOVE_KEYS.includes(key)) {
        e.preventDefault();
        engineRef.current?.setInput(key, false);
      }
    };
    // Losing focus (alt-tab, clicking outside, hiding the window) would leave keys "held"
    // and keep the run going unattended — release input and pause instead.
    const onBlur = () => {
      engineRef.current?.clearInput();
      pauseGame();
    };
    const onVisibility = () => {
      if (document.hidden) onBlur();
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [pauseGame, resumeGame]);

  const handleSelectUpgrade = useCallback((index: number) => {
    const opt = upgradeOptions[index];
    const engine = engineRef.current;
    if (!opt || !engine) return;
    // Update UI state BEFORE applying: applyUpgrade may synchronously open the next
    // queued level-up (onLevelUp), whose state must win over this reset.
    setUpgradeOptions([]);
    setPendingAfter(0);
    setPhase("playing");
    engine.applyUpgrade(opt);
  }, [upgradeOptions, setPhase]);

  const handleReroll = useCallback(() => {
    const newOpts = engineRef.current?.rerollUpgrades();
    if (!newOpts) return;
    setUpgradeOptions(newOpts);
    setStats((prev) => ({ ...prev, rerolls: engineRef.current?.getRerollsLeft() ?? 0 }));
  }, []);

  const handleRestart = useCallback(() => {
    engineRef.current?.reset();
    setPhase("playing");
    setStats(initialStats(saveRef.current));
    setGoldEarned(0);
    setConstraintBonus({ score: 0, multiplier: 1 });
    setNewAchievements([]);
  }, [setPhase]);

  const handleGiveUp = useCallback(() => {
    engineRef.current?.setUserPaused(false);
    engineRef.current?.giveUp();
  }, []);

  const starsGained = newAchievements.reduce((sum, a) => sum + a.reward, 0);

  return (
    <div className="relative mx-auto" style={{ width: CANVAS_FIT_WIDTH }}>
      <div className="relative rounded-xl overflow-hidden border-2 border-slate-700 shadow-2xl">
        <canvas
          ref={canvasRef}
          width={CONFIG.canvasWidth}
          height={CONFIG.canvasHeight}
          className="block w-full h-auto"
          style={{ imageRendering: "pixelated" }}
        />

        {/* HUD visible during play, level-up and pause */}
        {phase !== "gameover" && <HUD stats={stats} />}

        {/* Level up modal */}
        {phase === "levelup" && (
          <UpgradeModal
            options={upgradeOptions}
            onSelect={handleSelectUpgrade}
            onReroll={handleReroll}
            rerollsLeft={stats.rerolls}
            pendingAfter={pendingAfter}
          />
        )}

        {/* Pause menu */}
        {phase === "paused" && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 backdrop-blur-sm px-6">
            <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900/90 p-6">
              <h2 className="mb-1 text-center text-2xl font-bold tracking-wide text-slate-100">일시정지</h2>
              <p className="mb-5 text-center text-xs text-slate-500">ESC / P 로 계속하기</p>
              <SettingsPanel />
              <div className="mt-6 flex flex-col gap-2">
                <button
                  onClick={resumeGame}
                  className="flex items-center justify-center gap-2 rounded-lg bg-cyan-500 px-6 py-2.5 font-bold text-slate-900 transition-all hover:bg-cyan-400 active:scale-95"
                >
                  <Play className="h-4 w-4" /> 계속하기
                </button>
                <button
                  onClick={handleGiveUp}
                  className="flex items-center justify-center gap-2 rounded-lg border border-red-800/60 bg-red-950/40 px-6 py-2 text-sm font-semibold text-red-300 transition-all hover:border-red-500 hover:bg-red-900/40 active:scale-95"
                >
                  <Flag className="h-4 w-4" /> 게임 포기 (보상 정산)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Game over screen */}
        {phase === "gameover" && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm px-6">
            <h2 className={`text-3xl font-bold text-red-500 tracking-wide ${stats.failedElite ? "mb-2" : "mb-4"}`}>GAME OVER</h2>
            {stats.failedElite && (
              <p className="mb-4 text-sm font-semibold text-amber-200">엘리트를 30초 안에 처치하지 못했다</p>
            )}

            <div className="rounded-xl border border-slate-700 bg-slate-900/70 px-7 py-5 mb-4 flex flex-col gap-2 min-w-[260px]">
              {[
                { icon: UI_ICONS.time, label: "생존 시간", value: formatTime(stats.time), color: "text-cyan-300" },
                { icon: UI_ICONS.kills, label: "처치 수", value: stats.kills, color: "text-red-400" },
                { icon: UI_ICONS.level, label: "레벨", value: stats.level, color: "text-amber-300" },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-6 text-sm">
                  <span className="flex items-center gap-2 text-slate-400">
                    <GameIcon name={row.icon} size={16} className={row.color} />
                    {row.label}
                  </span>
                  <span className={`${row.color} font-mono font-bold`}>{row.value}</span>
                </div>
              ))}
              <div className="h-px bg-slate-700 my-1" />
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-semibold text-slate-300">
                  <GameIcon name={UI_ICONS.score} size={16} className="text-emerald-300" />
                  스코어
                </span>
                <span className="text-emerald-300 font-mono font-bold text-base">{stats.score}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-semibold text-amber-400">
                  <GameIcon name={UI_ICONS.gold} size={16} />
                  획득 골드
                </span>
                <span className="text-amber-300 font-mono font-bold text-base">+{goldEarned} G</span>
              </div>
              {constraintBonus.score > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-orange-300">제약 {constraintBonus.score}점</span>
                  <span className="text-orange-300 font-mono font-bold">골드 ×{constraintBonus.multiplier.toFixed(2)}</span>
                </div>
              )}
              {starsGained > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-semibold text-cyan-400">
                    <GameIcon name={UI_ICONS.star} size={16} />
                    업적 보상
                  </span>
                  <span className="text-cyan-300 font-mono font-bold text-base">+{starsGained} 별</span>
                </div>
              )}
            </div>

            {newAchievements.length > 0 && (
              <div className="mb-4 flex max-w-md flex-wrap justify-center gap-2">
                {newAchievements.map((a) => {
                  const wt = a.id.replace("evo_", "") as WeaponType;
                  return (
                    <div
                      key={a.id}
                      className="flex items-center gap-2 rounded-lg border border-amber-500/50 bg-amber-950/40 px-3 py-1.5"
                    >
                      <GameIcon name={weaponIcon(wt, true)} size={18} color={weaponColor(wt)} />
                      <span className="text-xs font-semibold text-amber-200">업적 달성 · {a.name}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Weapons used this run */}
            <div className="mb-5 flex flex-wrap justify-center gap-1.5">
              {stats.weapons.map((w) => (
                <span
                  key={w.type}
                  title={w.name}
                  className={`flex items-center gap-1 rounded-md border px-1.5 py-1 text-[11px] ${
                    w.evolved ? "border-amber-500/60 text-amber-300" : "border-slate-700 text-slate-400"
                  }`}
                >
                  <GameIcon name={weaponIcon(w.type, w.evolved)} size={14} color={weaponColor(w.type)} />
                  {w.evolved ? "MAX" : `Lv${w.level}`}
                </span>
              ))}
            </div>

            <button
              onClick={handleRestart}
              className="rounded-lg bg-cyan-500 px-8 py-3 font-bold text-slate-900 transition-all hover:bg-cyan-400 active:scale-95"
            >
              다시 시작
            </button>
            <button
              onClick={onExit}
              className="mt-3 text-slate-400 text-sm hover:text-slate-100 transition-colors"
            >
              로비로 돌아가기
            </button>
          </div>
        )}
      </div>

      {/* Controls hint + pause + give up */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-slate-500 text-sm">
          WASD / 방향키 이동 · 공격은 자동 · <span className="text-slate-400">ESC</span> 일시정지
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => (phase === "paused" ? resumeGame() : pauseGame())}
            disabled={phase !== "playing" && phase !== "paused"}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2
                       text-slate-300 text-sm transition-colors hover:border-slate-500 hover:text-slate-100
                       disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {phase === "paused" ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            {phase === "paused" ? "계속" : "일시정지 · 설정"}
          </button>
          <button
            onClick={handleGiveUp}
            disabled={phase !== "playing"}
            className="flex items-center gap-1.5 rounded-lg border border-red-800/50 bg-red-950/40 px-4 py-2
                       text-red-400 text-sm font-semibold transition-all
                       hover:border-red-500 hover:bg-red-900/40 hover:text-red-300 active:scale-95
                       disabled:opacity-30 disabled:cursor-not-allowed"
          >
            게임 포기
          </button>
        </div>
      </div>
    </div>
  );
}
