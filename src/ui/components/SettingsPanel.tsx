// ============================================================
//  SettingsPanel — graphics quality + SFX volume (pause menu and the settings screen).
// ============================================================

import { Volume2, VolumeX } from "lucide-react";
import type { QualitySetting } from "@/game/core/settings";
import { isAutoDowngraded } from "@/game/render/quality";
import { playUiSound } from "@/game/core/audio";
import { useSettings } from "@/ui/hooks/useSettings";

const QUALITY_OPTIONS: { value: QualitySetting; label: string; hint: string }[] = [
  { value: "auto", label: "자동", hint: "프레임이 떨어지면 장식 효과를 줄입니다" },
  { value: "high", label: "높음", hint: "모든 효과 표시" },
  { value: "low", label: "저사양", hint: "장식 효과 생략 (게임 정보는 그대로)" },
];

export function SettingsPanel() {
  const [settings, update] = useSettings();
  const volumePct = Math.round(settings.volume * 100);
  const downgraded = settings.quality === "auto" && isAutoDowngraded();

  return (
    <div className="flex flex-col gap-4 text-left">
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-200">그래픽 품질</span>
          {downgraded && <span className="text-[11px] text-amber-400">자동 → 저사양 적용 중</span>}
        </div>
        <div className="grid grid-cols-3 gap-1.5 rounded-lg bg-slate-950/60 p-1">
          {QUALITY_OPTIONS.map((q) => (
            <button
              key={q.value}
              onClick={() => update({ quality: q.value })}
              title={q.hint}
              className={`rounded-md px-2 py-1.5 text-xs font-semibold transition-colors ${
                settings.quality === q.value
                  ? "bg-cyan-500 text-slate-900"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              {q.label}
            </button>
          ))}
        </div>
        <p className="mt-1 text-[11px] text-slate-500">
          {QUALITY_OPTIONS.find((q) => q.value === settings.quality)?.hint}
        </p>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-200">효과음</span>
          <span className="font-mono text-xs text-slate-400">{settings.muted ? "음소거" : `${volumePct}%`}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => update({ muted: !settings.muted })}
            className="rounded-md border border-slate-700 bg-slate-900/60 p-1.5 text-slate-300 hover:border-slate-500 hover:text-slate-100"
            aria-label={settings.muted ? "음소거 해제" : "음소거"}
          >
            {settings.muted || settings.volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={volumePct}
            onChange={(e) => update({ volume: Number(e.target.value) / 100, muted: false })}
            onPointerUp={() => playUiSound()}
            onKeyUp={() => playUiSound()}
            className="h-1.5 flex-1 cursor-pointer accent-cyan-400"
            aria-label="효과음 볼륨"
          />
        </div>
      </div>
    </div>
  );
}
