import type { GameStats } from "@/game/core/types";
import { CONFIG } from "@/game/data/config";
import { accessoryColor, weaponColor } from "@/ui/theme";
import { GameIcon } from "@/ui/components/GameIcon";
import { UI_ICONS, accessoryIconName, weaponIcon } from "@/ui/icons";

interface HUDProps {
  stats: GameStats;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function StatRow({ icon, value, label, color }: { icon: string; value: string | number; label: string; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <GameIcon name={icon} size={16} className={color} />
      <span className={`${color} font-mono text-lg font-bold tabular-nums leading-none`}>{value}</span>
      <span className="text-slate-400 text-xs uppercase tracking-wider">{label}</span>
    </div>
  );
}

export function HUD({ stats }: HUDProps) {
  const xpPercent = stats.xpToNext > 0 ? Math.min(100, (stats.xp / stats.xpToNext) * 100) : 0;
  const hpPercent = stats.maxHp > 0 ? Math.max(0, Math.min(100, (stats.hp / stats.maxHp) * 100)) : 0;
  const emptyWeaponSlots = Math.max(0, CONFIG.maxWeapons - stats.weapons.length);

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {/* XP bar at top */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-slate-800/80">
        <div
          className="h-full bg-cyan-400 transition-all duration-150 ease-out"
          style={{ width: `${xpPercent}%` }}
        />
      </div>

      {/* Top-left: time, kills, score, level */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 rounded-lg bg-slate-950/40 px-2.5 py-2">
        <StatRow icon={UI_ICONS.time} value={formatTime(stats.time)} label="생존" color="text-cyan-300" />
        <StatRow icon={UI_ICONS.kills} value={stats.kills} label="처치" color="text-red-400" />
        <StatRow icon={UI_ICONS.score} value={stats.score} label="스코어" color="text-emerald-300" />
        <div className="flex items-center gap-2">
          <GameIcon name={UI_ICONS.level} size={16} className="text-amber-300" />
          <span className="text-amber-300 font-mono text-lg font-bold tabular-nums leading-none">
            Lv {stats.level}
          </span>
          <span className="text-slate-400 text-xs tabular-nums">
            {Math.floor(stats.xp)}/{stats.xpToNext}
          </span>
        </div>
      </div>

      {stats.eliteSeconds != null && (
        <div
          className={`absolute left-1/2 top-5 flex -translate-x-1/2 items-center gap-2 rounded-lg border px-3 py-1.5 ${
            stats.eliteSeconds <= 10 ? "border-red-500 bg-red-950/90" : "border-amber-400 bg-slate-950/90"
          }`}
        >
          <GameIcon name={UI_ICONS.crown} size={16} className={stats.eliteSeconds <= 10 ? "text-red-300" : "text-amber-300"} />
          <span className={`font-mono text-lg font-bold tabular-nums ${stats.eliteSeconds <= 10 ? "text-red-200" : "text-amber-200"}`}>
            {Math.ceil(stats.eliteSeconds)}
          </span>
        </div>
      )}

      {/* Top-right: HP bar + rerolls */}
      <div className="absolute top-4 right-4 w-48 rounded-lg bg-slate-950/40 px-2.5 py-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-slate-300 text-xs uppercase tracking-wider">HP</span>
          <span className="text-slate-300 font-mono text-xs tabular-nums">
            {Math.ceil(stats.hp)}/{stats.maxHp}
          </span>
        </div>
        <div className="h-3 bg-slate-800/80 rounded-sm overflow-hidden border border-slate-700">
          <div
            className="h-full transition-all duration-200 ease-out"
            style={{
              width: `${hpPercent}%`,
              backgroundColor: hpPercent > 50 ? "#22c55e" : hpPercent > 25 ? "#eab308" : "#ef4444",
            }}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-end gap-1 text-[11px] text-slate-400">
          <GameIcon name={UI_ICONS.reroll} size={12} />
          리롤 <span className="font-mono tabular-nums text-slate-200">{stats.rerolls}</span>
        </div>
      </div>

      {/* Bottom-left: weapons + accessories */}
      <div className="absolute bottom-3 left-4 flex flex-col gap-1.5 max-w-[70%]">
        <div className="flex flex-wrap gap-1.5">
          {stats.weapons.map((w, i) => (
            <div
              key={`${w.type}-${i}`}
              className={`flex items-center gap-1.5 rounded-md bg-slate-900/80 border px-1.5 py-1 ${
                w.evolved ? "border-amber-500/70" : "border-slate-700"
              }`}
            >
              <GameIcon name={weaponIcon(w.type, w.evolved)} size={18} color={weaponColor(w.type)} />
              <span className="text-slate-200 text-xs font-medium">{w.name}</span>
              <span className={`text-xs tabular-nums ${w.evolved ? "text-amber-400 font-bold" : "text-slate-500"}`}>
                {w.evolved ? "MAX" : `Lv${w.level}`}
              </span>
            </div>
          ))}
          {Array.from({ length: emptyWeaponSlots }, (_, i) => (
            <div key={`empty-${i}`} className="w-7 h-7 rounded-md border border-dashed border-slate-700/70 bg-slate-900/30" />
          ))}
        </div>
        {stats.accessories.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {stats.accessories.map((a, i) => (
              <div
                key={`${a.type}-${i}`}
                className="flex items-center gap-1 rounded-md bg-slate-900/60 border border-violet-900/50 px-1.5 py-0.5"
              >
                <GameIcon name={accessoryIconName(a.type)} size={14} color={accessoryColor(a.type)} />
                <span className="text-slate-300 text-[10px] font-medium">{a.name}</span>
                <span className="text-slate-500 text-[10px] tabular-nums">Lv{a.level}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
