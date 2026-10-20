// ============================================================
//  PixelSprite — pixel-art portraits and walking sprites for the UI
//  (src/assets/pixel). Crisp scaling via image-rendering.
//  Most sheets are Ninja Adventure (CC0, 16px frames). Linya and Euroan are 32px LPC.
//
//  <PixelFace kind="char" id="survivor" size={48} />   38×38 faceset, square
//  <PixelWalker id="survivor" size={64} />            4-frame walk loop (CSS steps)
//  Both fall back to the SVG emblem (GameIcon) when an asset is missing.
// ============================================================

import type { CSSProperties } from "react";
import { pixelUrl } from "@/assets/pixel";
import { characterFace, characterSheet, enemyFace, enemySheet } from "@/assets/pixel/catalog";
import { GameIcon } from "@/ui/components/GameIcon";
import { characterIcon, enemyIcon } from "@/ui/icons";

const PIXELATED: CSSProperties = { imageRendering: "pixelated" };

interface FaceProps {
  kind: "char" | "enemy";
  id: string;
  size: number;
  /** Fallback emblem color */
  color?: string;
  className?: string;
  /** Dim + desaturate (e.g. not owned) */
  dimmed?: boolean;
}

export function PixelFace({ kind, id, size, color, className = "", dimmed }: FaceProps) {
  const name = kind === "char" ? characterFace(id) : enemyFace(id);
  const url = name ? pixelUrl(name) : undefined;
  if (!url) {
    return <GameIcon name={kind === "char" ? characterIcon(id) : enemyIcon(id)} size={Math.round(size * 0.7)} color={color} />;
  }
  return (
    <img
      src={url}
      alt=""
      aria-hidden
      draggable={false}
      width={size}
      height={size}
      className={`shrink-0 ${dimmed ? "opacity-50 grayscale" : ""} ${className}`}
      style={PIXELATED}
    />
  );
}

interface WalkerProps {
  kind?: "char" | "enemy";
  id: string;
  size: number;
  /** Facing column: 0 down, 1 up, 2 left, 3 right */
  facing?: number;
  className?: string;
}

/** Walking unit (sheet = 4 columns × 4 rows; rows animate). Source pixel size does not matter. */
export function PixelWalker({ kind = "char", id, size, facing = 0, className = "" }: WalkerProps) {
  const sheet = kind === "char" ? characterSheet(id) : enemySheet(id);
  const url = sheet ? pixelUrl(sheet) : undefined;
  if (!url) return <GameIcon name={kind === "char" ? characterIcon(id) : enemyIcon(id)} size={size} />;
  return (
    <span
      aria-hidden
      className={`pixel-walker inline-block shrink-0 ${className}`}
      style={{
        ...PIXELATED,
        width: size,
        height: size,
        backgroundImage: `url("${url}")`,
        backgroundSize: `${size * 4}px ${size * 4}px`,
        backgroundPositionX: -facing * size,
        ["--walk-h" as string]: `${size * 4}px`,
      }}
    />
  );
}
