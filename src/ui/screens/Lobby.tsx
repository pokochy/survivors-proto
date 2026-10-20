import { Scale, Settings } from "lucide-react";
import { GAME_INFO } from "@/gameInfo";
import type { SaveData } from "@/game/core/storage";
import { CHARACTERS } from "@/game/data/progression";
import { weaponName } from "@/game/systems/WeaponManager";
import { PixelFace, PixelWalker } from "@/ui/components/PixelSprite";
import { GameIcon } from "@/ui/components/GameIcon";
import { constraintGoldMultiplier, constraintScore } from "@/game/data/constraints";
import { UI_ICONS, weaponIcon } from "@/ui/icons";
import { readableAccent, weaponColor } from "@/ui/theme";

export type Screen = "lobby" | "game" | "gacha" | "codex" | "achievements" | "characters" | "traits" | "constraints" | "settings";

interface LobbyProps {
  onNavigate: (screen: Screen) => void;
  save: SaveData;
}

interface MenuCard {
  title: string;
  desc: string;
  icon?: string;
  lucide?: "constraints" | "settings";
  iconColor: string;
  color: string;
  hoverColor: string;
  glow: string;
  screen: Screen;
}

const MENU_ITEMS: MenuCard[] = [
  {
    title: "게임 시작",
    desc: "끝없이 몰려오는 적과 싸워 살아남으세요",
    icon: UI_ICONS.play,
    iconColor: "#67e8f9",
    color: "border-cyan-500/40 bg-cyan-950/30",
    hoverColor: "hover:border-cyan-400 hover:bg-cyan-900/40",
    glow: "group-hover:shadow-cyan-500/20",
    screen: "game",
  },
  {
    title: "제약",
    desc: "난이도를 올리고 완료 보상을 늘리세요",
    lucide: "constraints",
    iconColor: "#fdba74",
    color: "border-orange-500/40 bg-orange-950/30",
    hoverColor: "hover:border-orange-400 hover:bg-orange-900/40",
    glow: "group-hover:shadow-orange-500/20",
    screen: "constraints",
  },
  {
    title: "캐릭터 뽑기",
    desc: "새로운 캐릭터를 뽑아 전투에 활용하세요",
    icon: UI_ICONS.gacha,
    iconColor: "#fcd34d",
    color: "border-amber-500/40 bg-amber-950/30",
    hoverColor: "hover:border-amber-400 hover:bg-amber-900/40",
    glow: "group-hover:shadow-amber-500/20",
    screen: "gacha",
  },
  {
    title: "캐릭터 관리",
    desc: "보유한 캐릭터를 선택하고 강화하세요",
    icon: UI_ICONS.characters,
    iconColor: "#7dd3fc",
    color: "border-sky-500/40 bg-sky-950/30",
    hoverColor: "hover:border-sky-400 hover:bg-sky-900/40",
    glow: "group-hover:shadow-sky-500/20",
    screen: "characters",
  },
  {
    title: "특성",
    desc: "모든 캐릭터에 적용되는 영구 성장",
    icon: UI_ICONS.traits,
    iconColor: "#c4b5fd",
    color: "border-violet-500/40 bg-violet-950/30",
    hoverColor: "hover:border-violet-400 hover:bg-violet-900/40",
    glow: "group-hover:shadow-violet-500/20",
    screen: "traits",
  },
  {
    title: "도감",
    desc: "발견한 적과 캐릭터를 확인하세요",
    icon: UI_ICONS.codex,
    iconColor: "#6ee7b7",
    color: "border-emerald-500/40 bg-emerald-950/30",
    hoverColor: "hover:border-emerald-400 hover:bg-emerald-900/40",
    glow: "group-hover:shadow-emerald-500/20",
    screen: "codex",
  },
  {
    title: "업적",
    desc: "달성한 업적을 추적하세요",
    icon: UI_ICONS.achievements,
    iconColor: "#fda4af",
    color: "border-rose-500/40 bg-rose-950/30",
    hoverColor: "hover:border-rose-400 hover:bg-rose-900/40",
    glow: "group-hover:shadow-rose-500/20",
    screen: "achievements",
  },
  {
    title: "설정",
    desc: "그래픽과 효과음을 조절하세요",
    lucide: "settings",
    iconColor: "#cbd5e1",
    color: "border-slate-500/40 bg-slate-900/40",
    hoverColor: "hover:border-slate-400 hover:bg-slate-800/60",
    glow: "group-hover:shadow-slate-500/20",
    screen: "settings",
  },
];

/** Icon artists to credit (CC BY 3.0 requires attribution) — see src/assets/icons/credits.json */
const ICON_AUTHORS = "Lorc, Delapouite, Skoll, Sbed, DarkZaitzev, Willdabeast";

export function Lobby({ onNavigate, save }: LobbyProps) {
  const charDef = CHARACTERS.find((c) => c.id === save.selectedCharacter) ?? CHARACTERS[0];
  const runScore = constraintScore(save.constraintLevels);
  const runGold = constraintGoldMultiplier(runScore);
  const owned = save.owned.find((o) => o.id === charDef.id);

  return (
    <div className="relative min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 py-12">
      {/* Top bar: currencies + settings */}
      <div className="absolute right-4 top-4 flex items-center gap-2">
        <span className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-1.5 text-sm">
          <GameIcon name={UI_ICONS.gold} size={16} className="text-amber-400" />
          <span className="font-mono font-bold text-amber-300">{save.gold}</span>
          <span className="text-xs text-slate-500">G</span>
        </span>
        <span className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-1.5 text-sm">
          <GameIcon name={UI_ICONS.star} size={16} className="text-cyan-400" />
          <span className="font-mono font-bold text-cyan-300">{save.stars}</span>
          <span className="text-xs text-slate-500">별</span>
        </span>
        <button
          onClick={() => onNavigate("settings")}
          className="rounded-lg border border-slate-800 bg-slate-900/70 p-2 text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-100"
          aria-label="설정"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>

      {/* Title */}
      <div className="text-center mb-8">
        <h1 className="text-5xl font-extrabold text-slate-100 tracking-tight">
          {GAME_INFO.title}
        </h1>
        <p className="text-cyan-400 text-lg font-semibold tracking-widest mt-1">
          {GAME_INFO.subtitle}
        </p>
        <p className="text-slate-500 text-sm mt-3">
          {GAME_INFO.tagline}
        </p>
      </div>

      {/* Owned party walking on a strip of grass (selected character first) */}
      <div className="mb-5 flex items-end gap-1 rounded-xl border border-[#4d7a2a] bg-[#3f6b24] px-4 pb-1 pt-2 shadow-inner">
        {[charDef, ...CHARACTERS.filter((c) => c.id !== charDef.id && save.owned.some((o) => o.id === c.id))].map((c, i) => (
          <PixelWalker key={c.id} id={c.id} size={i === 0 ? 48 : 36} facing={i === 0 ? 0 : 2} />
        ))}
      </div>

      {/* Selected character */}
      <button
        onClick={() => onNavigate("characters")}
        className="group mb-6 flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-2.5 transition-colors hover:border-slate-600"
      >
        <span
          className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-lg"
          style={{ border: `2px solid ${readableAccent(charDef.color)}` }}
        >
          <PixelFace kind="char" id={charDef.id} size={40} color={readableAccent(charDef.color)} />
        </span>
        <span className="text-left">
          <span className="block text-[11px] uppercase tracking-wider text-slate-500">플레이 캐릭터</span>
          <span className="flex items-center gap-2 text-sm font-bold text-slate-100">
            {charDef.name}
            <span className="font-mono text-xs font-normal text-slate-400">
              Lv{owned?.level ?? 1} · ★{owned?.stars ?? 0}
              {(owned?.breakthrough ?? 0) > 0 && ` · ${owned?.breakthrough}돌파`}
            </span>
          </span>
        </span>
        <span className="ml-2 flex items-center gap-1 rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300">
          <GameIcon name={weaponIcon(charDef.startWeapon)} size={14} color={weaponColor(charDef.startWeapon)} />
          {weaponName(charDef.startWeapon)}
        </span>
      </button>

      {/* Menu grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-3xl">
        {MENU_ITEMS.map((item) => {
          const desc =
            item.screen === "constraints" && runScore > 0
              ? `점수 ${runScore} · 골드 ×${runGold.toFixed(2)}`
              : item.desc;
          return (
          <button
            key={item.screen}
            onClick={() => onNavigate(item.screen)}
            className={`group relative flex items-center gap-5 rounded-2xl border-2 ${item.color} ${item.hoverColor}
                       px-6 py-6 text-left transition-all duration-300
                       hover:scale-[1.02] active:scale-[0.99] shadow-lg ${item.glow}
                       hover:shadow-xl`}
          >
            <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-slate-900/60 flex items-center justify-center
                            transition-transform duration-300 group-hover:scale-110">
              {item.lucide === "constraints" ? (
                <Scale className="h-8 w-8" style={{ color: item.iconColor }} />
              ) : item.lucide === "settings" ? (
                <Settings className="h-8 w-8" style={{ color: item.iconColor }} />
              ) : (
                <GameIcon name={item.icon ?? UI_ICONS.play} size={32} color={item.iconColor} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-slate-100 mb-0.5">
                {item.title}
              </h2>
              <p className="text-slate-400 text-sm leading-snug">
                {desc}
              </p>
            </div>
          </button>
          );
        })}
      </div>

      {/* Footer */}
      <p className="text-slate-600 text-xs mt-8 tracking-wider">
        WASD / 방향키 — 이동 · 공격은 자동 · ESC — 일시정지
      </p>
      <p className="mt-2 text-[11px] text-slate-700">
        v{GAME_INFO.version} · Icons by {ICON_AUTHORS} (game-icons.net, CC BY 3.0) · Pixel art: Ninja Adventure by Pixel-boy &amp; AAA (CC0) · 리냐·에우로안: Universal LPC (CC BY-SA 3.0)
      </p>

    </div>
  );
}
