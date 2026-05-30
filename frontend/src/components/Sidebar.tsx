"use client";
import type { GameState, Player, PlayerConfig } from "@/lib/types";

interface Props {
  gameState: GameState;
  myPlayerId: Player | null;
  roomCode: string | null;
  timeLeft: number;
  timePerTurn: number;
  canUndo: boolean;
  onUndo: () => void;
  onReset: () => void;
  onHome: () => void;
}

const PLAYER_COLORS: Record<number, string> = {
  1: "#4f8ef7",
  2: "#e85c5c",
  3: "#4cbe8a",
  4: "#f0a030",
};

function PlayerCard({
  player,
  isActive,
  isMe,
}: {
  player: PlayerConfig;
  isActive: boolean;
  isMe: boolean;
}) {
  const color = PLAYER_COLORS[player.id];
  const dead = !player.alive || player.orbCount === 0;

  return (
    <div
      className={[
        "flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all",
        isActive
          ? "border-opacity-60 bg-opacity-10"
          : "border-gray-800 bg-transparent opacity-60",
        dead ? "opacity-30" : "",
      ].join(" ")}
      style={
        isActive
          ? { borderColor: color, backgroundColor: `${color}18` }
          : undefined
      }
    >
      {/* Colour dot */}
      <div
        className="w-3 h-3 rounded-full flex-shrink-0"
        style={{ backgroundColor: color, boxShadow: isActive ? `0 0 8px ${color}` : "none" }}
      />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate text-gray-100">
          {player.name}
          {player.isAI && (
            <span className="ml-1 text-xs font-normal text-gray-500">CPU</span>
          )}
          {isMe && (
            <span className="ml-1 text-xs font-normal text-gray-500">(you)</span>
          )}
        </p>
        <p className="text-xs text-gray-500">
          {dead ? "eliminated" : `${player.orbCount} orb${player.orbCount !== 1 ? "s" : ""}`}
        </p>
      </div>

      {isActive && (
        <div
          className="w-2 h-2 rounded-full animate-pulse"
          style={{ backgroundColor: color }}
        />
      )}
    </div>
  );
}

export default function Sidebar({ gameState, myPlayerId, roomCode, timeLeft, timePerTurn, canUndo, onUndo, onReset, onHome }: Props) {
  const alivePlayers = gameState.players.filter((p) => p.alive);
  const currentColor = PLAYER_COLORS[gameState.currentPlayer] ?? "#fff";
  // SVG circle: r=15, circumference ≈ 94.25
  const CIRC = 94.25;
  const dashOffset = CIRC * (1 - timeLeft / timePerTurn);

  return (
    <aside className="flex flex-col gap-5 w-52 flex-shrink-0">
      {/* Title */}
      <div>
        <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          Deton8
        </h1>
        {roomCode && (
          <p className="text-xs text-gray-500 mt-0.5">
            Room: <span className="text-gray-300 font-mono tracking-widest">{roomCode}</span>
          </p>
        )}
      </div>

      {/* Players */}
      <div className="flex flex-col gap-2">
        <p className="text-xs text-gray-600 uppercase tracking-widest">Players</p>
        {gameState.players.map((p) => (
          <PlayerCard
            key={p.id}
            player={p}
            isActive={p.id === gameState.currentPlayer && gameState.status === "playing"}
            isMe={p.id === myPlayerId}
          />
        ))}
      </div>

      {/* Stats */}
      <div className="border border-gray-800 rounded-xl px-3 py-3 flex flex-col gap-2">
        <p className="text-xs text-gray-600 uppercase tracking-widest">Game</p>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Move</span>
          <span className="text-gray-200 font-semibold">{gameState.moveCount}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Alive</span>
          <span className="text-gray-200 font-semibold">{alivePlayers.length}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Board</span>
          <span className="text-gray-200 font-semibold">
            {gameState.rows}×{gameState.cols}
          </span>
        </div>
      </div>

      {/* Timer ring */}
      {timeLeft > 0 && gameState.status === "playing" && (
        <div className="flex flex-col items-center gap-1">
          <div className="relative w-16 h-16">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <circle cx="18" cy="18" r="15" fill="none" stroke="#1f2937" strokeWidth="2.5" />
              <circle
                cx="18" cy="18" r="15"
                fill="none"
                stroke={timeLeft <= 4 ? "#ef4444" : currentColor}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={CIRC}
                strokeDashoffset={isNaN(dashOffset) ? 0 : dashOffset}
                style={{ transition: "stroke-dashoffset 0.9s linear, stroke 0.3s" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-xl font-bold tabular-nums ${timeLeft <= 4 ? "text-red-400" : "text-white"}`}>
                {timeLeft}
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-600">seconds left</p>
        </div>
      )}

      {/* Actions */}
      <div className="mt-auto flex flex-col gap-2">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="w-full py-2 text-sm rounded-lg border border-gray-800 text-gray-500 hover:text-gray-300 hover:border-gray-600 disabled:opacity-25 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5"
        >
          <span>↩</span> Undo
        </button>
        <button
          onClick={onReset}
          className="w-full py-2 text-sm rounded-lg border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-gray-200 transition-all"
        >
          New Game
        </button>
        <button
          onClick={onHome}
          className="w-full py-2 text-sm rounded-lg border border-gray-800 text-gray-600 hover:text-gray-400 transition-all"
        >
          Main Menu
        </button>
      </div>
    </aside>
  );
}
