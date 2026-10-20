// ============================================================
//  ConstraintScreen — Pick handicaps for the next run. The score
//  multiplies gold when the run ends.
// ============================================================

import { ArrowLeft, Minus, Plus, RotateCcw } from "lucide-react";
import {
  CONSTRAINTS,
  constraintGoldMultiplier,
  constraintScore,
  normalizeConstraintLevels,
} from "@/game/data/constraints";
import type { SaveData } from "@/game/core/storage";

interface ConstraintScreenProps {
  onBack: () => void;
  save: SaveData;
  onUpdate: (save: SaveData) => void;
}

export function ConstraintScreen({ onBack, save, onUpdate }: ConstraintScreenProps) {
  const levels = normalizeConstraintLevels(save.constraintLevels);
  const score = constraintScore(levels);
  const multiplier = constraintGoldMultiplier(score);

  function setLevel(id: string, next: number) {
    onUpdate({
      ...save,
      constraintLevels: normalizeConstraintLevels({ ...levels, [id]: next }),
    });
  }

  function clearAll() {
    onUpdate({ ...save, constraintLevels: normalizeConstraintLevels({}) });
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-400 transition-colors hover:text-slate-100"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm">로비로</span>
          </button>
          {score > 0 && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-500 hover:text-slate-100"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              모두 해제
            </button>
          )}
        </div>

        <h1 className="mb-1 text-3xl font-bold text-slate-100">제약</h1>
        <p className="mb-6 text-sm text-slate-500">
          같은 제약도 단계를 올릴 수 있습니다. 점수가 높을수록 판이 끝난 뒤 골드를 더 받습니다.
        </p>

        <div className="mb-5 flex items-center justify-between rounded-2xl border border-orange-500/40 bg-orange-950/30 px-5 py-4">
          <div>
            <p className="text-xs text-orange-200/70">제약 점수</p>
            <p className="font-mono text-2xl font-bold text-orange-200">{score}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-amber-200/70">완료 보상 골드</p>
            <p className="font-mono text-2xl font-bold text-amber-300">×{multiplier.toFixed(2)}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {CONSTRAINTS.map((c) => {
            const level = levels[c.id] ?? 0;
            const step = c.steps[level];
            const atMin = level <= 0;
            const atMax = level >= c.steps.length - 1;
            return (
              <div
                key={c.id}
                className="flex items-center gap-4 rounded-xl border border-slate-700/70 bg-slate-900/60 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-100">{c.name}</p>
                  <p className="text-xs text-slate-500">{c.desc}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setLevel(c.id, level - 1)}
                    disabled={atMin}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 text-slate-200 hover:border-slate-500 disabled:cursor-default disabled:border-slate-800 disabled:text-slate-600"
                    aria-label={`${c.name} 낮추기`}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-14 text-center font-mono text-sm font-bold text-slate-100">{step.label}</span>
                  <button
                    onClick={() => setLevel(c.id, level + 1)}
                    disabled={atMax}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 text-slate-200 hover:border-slate-500 disabled:cursor-default disabled:border-slate-800 disabled:text-slate-600"
                    aria-label={`${c.name} 높이기`}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <span className={`w-12 text-right font-mono text-sm ${step.score > 0 ? "text-orange-300" : "text-slate-600"}`}>
                  {step.score}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
