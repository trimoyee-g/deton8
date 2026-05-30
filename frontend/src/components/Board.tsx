"use client";
import Cell from "./Cell";
import type { GameState, Player } from "@/lib/types";

interface Props {
  gameState: GameState;
  myPlayerId: Player | null;
  explodedCells: Set<string>;
  onCellClick: (r: number, c: number) => void;
}

export default function Board({ gameState, myPlayerId, explodedCells, onCellClick }: Props) {
  const { board, rows, cols, currentPlayer, status } = gameState;

  const isMyTurn =
    status === "playing" &&
    (myPlayerId === null || myPlayerId === currentPlayer);

  return (
    <div style={{ perspective: "1000px", paddingBottom: "40px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 56px)`,
          gridTemplateRows: `repeat(${rows}, 56px)`,
          gap: "3px",
          transformStyle: "preserve-3d",
          transformOrigin: "center top",
          filter: "drop-shadow(0 40px 30px rgba(0,0,0,0.7))",
        }}
      >
        {board.map((row, r) =>
          row.map((cell, c) => (
            <Cell
              key={`${r}-${c}`}
              cell={cell}
              row={r}
              col={c}
              rows={rows}
              cols={cols}
              currentPlayer={currentPlayer}
              isExploded={explodedCells.has(`${r},${c}`)}
              isMyTurn={isMyTurn}
              onClick={() => onCellClick(r, c)}
            />
          ))
        )}
      </div>
    </div>
  );
}
