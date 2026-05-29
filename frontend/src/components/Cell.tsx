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

/** Positions for 1–4 orbs inside a cell */
const ORB_POSITIONS: Record<number, { top: string; left: string }[]> = {
  1: [{ top: "50%", left: "50%" }],
  2: [
    { top: "50%", left: "33%" },
    { top: "50%", left: "67%" },
  ],
  3: [
    { top: "30%", left: "50%" },
    { top: "68%", left: "28%" },
    { top: "68%", left: "72%" },
  ],
  4: [
    { top: "30%", left: "30%" },
    { top: "30%", left: "70%" },
    { top: "70%", left: "30%" },
    { top: "70%", left: "70%" },
  ],
};

export default function Cell({
  cell,
  row,
  col,
  rows,
  cols,
  currentPlayer,
  isExploded,
  isMyTurn,
  onClick,
}: Props) {
  const cm = criticalMass(row, col, rows, cols);
  const isCritical = cell.player !== 0 && cell.count === cm - 1;
  const color = cell.player !== 0 ? PLAYER_COLORS[cell.player] : null;

  // Can the current player place here?
  const canPlace =
    isMyTurn && (cell.player === 0 || cell.player === currentPlayer);

  const displayCount = Math.min(cell.count, 4);
  const positions = ORB_POSITIONS[displayCount] ?? ORB_POSITIONS[4];

  return (
    <div
      onClick={onClick}
      className={[
        "relative select-none transition-all duration-100",
        "w-14 h-14 rounded-lg border",
        isExploded ? "animate-cell-explode" : "",
        isCritical ? "animate-pulse-warn" : "",
        canPlace ? "cursor-pointer hover:brightness-125" : "cursor-default",
      ].join(" ")}
      style={{
        borderColor: color ? `${color}44` : "#ffffff18",
        backgroundColor: color ? `${color}14` : "#ffffff08",
      }}
    >
      {/* Orb dots */}
      {cell.count > 0 && color &&
        positions.map((pos, i) => (
          <span
            key={i}
            className="absolute w-3.5 h-3.5 rounded-full animate-orb-pop"
            style={{
              backgroundColor: color,
              top: pos.top,
              left: pos.left,
              transform: "translate(-50%, -50%)",
              boxShadow: `0 0 6px ${color}99`,
            }}
          />
        ))}

      {/* Overflow count badge */}
      {cell.count > 4 && (
        <span
          className="absolute bottom-0.5 right-1 text-[10px] font-bold"
          style={{ color: color ?? "#fff" }}
        >
          {cell.count}
        </span>
      )}

      {/* Critical mass indicator */}
      {isCritical && (
        <span className="absolute top-0.5 right-1 text-[9px] font-bold text-yellow-400 leading-none">
          !
        </span>
      )}

      {/* Hover placement ghost for current player */}
      {canPlace && cell.count === 0 && (
        <span
          className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-30 transition-opacity"
        >
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: PLAYER_COLORS[currentPlayer] }}
          />
        </span>
      )}
    </div>
  );
}
