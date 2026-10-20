// ============================================================
//  SettingsScreen — Lobby page for graphics quality and SFX.
// ============================================================

import { ArrowLeft } from "lucide-react";
import { SettingsPanel } from "@/ui/components/SettingsPanel";

interface SettingsScreenProps {
  onBack: () => void;
}

export function SettingsScreen({ onBack }: SettingsScreenProps) {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-lg">
        <button
          onClick={onBack}
          className="mb-6 flex items-center gap-2 text-slate-400 hover:text-slate-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">로비로</span>
        </button>

        <h1 className="text-3xl font-bold text-slate-100 mb-1">설정</h1>
        <p className="text-slate-500 text-sm mb-6">그래픽과 효과음을 조절합니다. 이 기기에만 저장됩니다.</p>

        <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6">
          <SettingsPanel />
        </div>
      </div>
    </div>
  );
}
