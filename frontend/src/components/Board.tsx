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

  // In online mode only the current player can act; in local modes always true
  const isMyTurn =
    status === "playing" &&
    (myPlayerId === null || myPlayerId === currentPlayer);

  return (
    <div
      className="grid gap-[3px]"
      style={{
        gridTemplateColumns: `repeat(${cols}, 56px)`,
        gridTemplateRows: `repeat(${rows}, 56px)`,
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
  );
}
