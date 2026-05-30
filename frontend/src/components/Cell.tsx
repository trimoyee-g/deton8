"use client";
import { criticalMass } from "@/lib/gameEngine";
import type { Cell as CellType, Player } from "@/lib/types";

interface Props {
  cell: CellType;
  row: number;
  col: number;
  rows: number;
  cols: number;
  currentPlayer: Player;
  isExploded: boolean;
  isMyTurn: boolean;
  onClick: () => void;
}

const PLAYER_COLORS: Record<number, string> = {
  1: "#4f8ef7",
  2: "#e85c5c",
  3: "#4cbe8a",
  4: "#f0a030",
};

const PLAYER_COLORS_DARK: Record<number, string> = {
  1: "#1a4a99",
  2: "#8b1a1a",
  3: "#1a6b42",
  4: "#8b5a0a",
};

const ORB_POSITIONS: Record<number, { top: string; left: string }[]> = {
  1: [{ top: "50%", left: "50%" }],
  2: [{ top: "50%", left: "33%" }, { top: "50%", left: "67%" }],
  3: [{ top: "30%", left: "50%" }, { top: "68%", left: "28%" }, { top: "68%", left: "72%" }],
  4: [{ top: "30%", left: "30%" }, { top: "30%", left: "70%" }, { top: "70%", left: "30%" }, { top: "70%", left: "70%" }],
};

export default function Cell({
  cell, row, col, rows, cols, currentPlayer, isExploded, isMyTurn, onClick,
}: Props) {
  const cm = criticalMass(row, col, rows, cols);
  const isCritical = cell.player !== 0 && cell.count === cm - 1;
  const color = cell.player !== 0 ? PLAYER_COLORS[cell.player] : null;
  const colorDark = cell.player !== 0 ? PLAYER_COLORS_DARK[cell.player] : null;
  const canPlace = isMyTurn && (cell.player === 0 || cell.player === currentPlayer);

  const displayCount = Math.min(cell.count, 4);
  const positions = ORB_POSITIONS[displayCount] ?? ORB_POSITIONS[4];

  return (
    <div
      onClick={onClick}
      className={[
        "relative select-none",
        "w-14 h-14 rounded-lg",
        isExploded ? "animate-cell-explode" : "",
        isCritical ? "animate-pulse-warn" : "",
        canPlace ? "cursor-pointer" : "cursor-default",
      ].join(" ")}
      style={{
        /* Top face */
        background: color
          ? `linear-gradient(145deg, ${color}22 0%, ${color}10 100%)`
          : "linear-gradient(145deg, #ffffff12 0%, #ffffff06 100%)",
        border: `1px solid ${color ? `${color}55` : "#ffffff18"}`,
        /* 3D depth — bottom "wall" of the cell box */
        boxShadow: isExploded
          ? `0 0 18px 4px ${color ?? "#fff"}88, 0 6px 0 ${colorDark ?? "#111"}, 0 10px 20px rgba(0,0,0,0.6)`
          : isCritical
          ? `0 0 8px 2px ${color ?? "#fff"}66, 0 5px 0 ${colorDark ?? "#111"}, 0 8px 16px rgba(0,0,0,0.5)`
          : `0 5px 0 ${colorDark ?? "#0a0a0f"}, 0 8px 16px rgba(0,0,0,0.5)`,
        transition: "box-shadow 0.15s ease, background 0.15s ease",
      }}
      onMouseEnter={(e) => {
        if (!canPlace) return;
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "";
      }}
    >
      {/* Orbs as spheres via radial gradient */}
      {cell.count > 0 && color &&
        positions.map((pos, i) => (
          <span
            key={i}
            className="absolute animate-orb-pop"
            style={{
              width: "14px",
              height: "14px",
              borderRadius: "50%",
              top: pos.top,
              left: pos.left,
              transform: "translate(-50%, -50%)",
              /* Sphere illusion: bright highlight top-left, dark bottom-right */
              background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.75) 0%, ${color} 45%, ${colorDark} 100%)`,
              boxShadow: `0 2px 6px rgba(0,0,0,0.5), 0 0 8px ${color}88`,
            }}
          />
        ))}

      {/* Overflow count */}
      {cell.count > 4 && (
        <span
          className="absolute bottom-0.5 right-1 text-[10px] font-bold"
          style={{ color: color ?? "#fff" }}
        >
          {cell.count}
        </span>
      )}

      {/* Critical mass ! */}
      {isCritical && (
        <span className="absolute top-0.5 right-1 text-[9px] font-bold text-yellow-400 leading-none">
          !
        </span>
      )}

      {/* Hover ghost orb */}
      {canPlace && cell.count === 0 && (
        <span className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-40 transition-opacity">
          <span
            style={{
              width: "12px", height: "12px", borderRadius: "50%",
              background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.7) 0%, ${PLAYER_COLORS[currentPlayer]} 60%)`,
            }}
          />
        </span>
      )}
    </div>
  );
}
