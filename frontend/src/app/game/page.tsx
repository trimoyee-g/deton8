"use client";
import Board from "@/components/Board";
import Chat from "@/components/Chat";
import GameOverModal from "@/components/GameOverModal";
import Sidebar from "@/components/Sidebar";
import { useGame, type GameConfig } from "@/hooks/useGame";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// ─── Online lobby waiting screen ──────────────────────────────────────────────
function LobbyScreen({
  roomCode,
  players,
  waitingFor,
}: {
  roomCode: string | null;
  players: { name: string; id: number }[];
  waitingFor: string | null;
}) {
  const [copied, setCopied] = useState(false);

  function copy() {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8">
      <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
        Chain Reaction
      </h1>

      {roomCode && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-gray-500">Share this code with friends</p>
          <button
            onClick={copy}
            className="flex items-center gap-3 px-6 py-3 bg-gray-800 border border-gray-700 rounded-xl hover:border-gray-500 transition-all group"
          >
            <span className="text-3xl font-mono font-bold tracking-[0.25em] text-blue-400">
              {roomCode}
            </span>
            <span className="text-gray-500 text-sm group-hover:text-gray-300 transition-colors">
              {copied ? "Copied!" : "copy"}
            </span>
          </button>
        </div>
      )}

      <div className="flex flex-col items-center gap-3">
        <p className="text-sm text-gray-500 uppercase tracking-widest">Players joined</p>
        <div className="flex flex-col gap-2 w-64">
          {players.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 px-4 py-2 rounded-lg bg-gray-800 border border-gray-700"
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: ["", "#4f8ef7", "#e85c5c", "#4cbe8a", "#f0a030"][p.id],
                }}
              />
              <span className="text-sm">{p.name}</span>
            </div>
          ))}
        </div>
      </div>

      {waitingFor && (
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <span className="inline-block w-4 h-4 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
          {waitingFor}
        </div>
      )}
    </div>
  );
}

// ─── Main game page ───────────────────────────────────────────────────────────
export default function GamePage() {
  const router = useRouter();
  const [config, setConfig] = useState<GameConfig | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    try {
      const raw = sessionStorage.getItem("gameConfig");
      if (!raw) { router.replace("/"); return; }
      setConfig(JSON.parse(raw) as GameConfig);
    } catch {
      router.replace("/");
    }
  }, [router]);

  const { gameState, myPlayerId, explodedCells, roomCode, waitingFor, lobbyPlayers, isLobby, error, chatMessages, sendChatMessage, handleCellClick, resetGame } =
    useGame(config);

  function goHome() {
    router.push("/");
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-4">
        <p className="text-red-400 text-lg font-semibold">Something went wrong</p>
        <p className="text-gray-500 text-sm">{error}</p>
        <button
          onClick={goHome}
          className="px-6 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-sm transition-all"
        >
          Back to menu
        </button>
      </div>
    );
  }

  // ── Online lobby ───────────────────────────────────────────────────────────
  if (isLobby) {
    return (
      <LobbyScreen
        roomCode={roomCode}
        players={lobbyPlayers}
        waitingFor={waitingFor}
      />
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  // ── Whose turn label ───────────────────────────────────────────────────────
  const currentPlayerCfg = gameState.players.find((p) => p.id === gameState.currentPlayer);
  const COLORS: Record<number, string> = {
    1: "#4f8ef7", 2: "#e85c5c", 3: "#4cbe8a", 4: "#f0a030",
  };
  const turnColor = currentPlayerCfg ? COLORS[currentPlayerCfg.id] : "#fff";

  return (
    <div className="min-h-screen flex items-start justify-center pt-8 pb-8 px-6 gap-8">
      {/* Left column: sidebar + chat */}
      <div className="flex flex-col gap-3">
        <Sidebar
          gameState={gameState}
          myPlayerId={myPlayerId}
          roomCode={roomCode}
          onReset={resetGame}
          onHome={goHome}
        />
        <Chat messages={chatMessages} onSend={sendChatMessage} />
      </div>

      <div className="flex flex-col gap-4">
        {/* Turn indicator */}
        <div className="flex items-center gap-2 h-7">
          {gameState.status === "playing" && currentPlayerCfg && (
            <>
              <span
                className="inline-block w-2.5 h-2.5 rounded-full animate-pulse"
                style={{ backgroundColor: turnColor }}
              />
              <span className="text-sm text-gray-400">
                <span className="font-semibold" style={{ color: turnColor }}>
                  {currentPlayerCfg.name}
                </span>
                {currentPlayerCfg.isAI ? " is thinking…" : "'s turn"}
              </span>
            </>
          )}
        </div>

        {/* Board */}
        <Board
          gameState={gameState}
          myPlayerId={myPlayerId}
          explodedCells={explodedCells}
          onCellClick={handleCellClick}
        />

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-gray-600 mt-1">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full bg-yellow-400/50 ring-1 ring-yellow-400/50" />
            critical mass
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full bg-white/20" />
            chain reaction
          </span>
        </div>
      </div>

      {/* Game over overlay */}
      {gameState.status === "finished" && gameState.winner !== null && (
        <GameOverModal
          gameState={gameState}
          myPlayerId={myPlayerId}
          onPlayAgain={resetGame}
          onHome={goHome}
        />
      )}
    </div>
  );
}
