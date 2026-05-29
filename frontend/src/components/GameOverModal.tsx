"use client";
import type { GameState, Player } from "@/lib/types";
import { useEffect, useState } from "react";

interface Props {
  gameState: GameState;
  myPlayerId: Player | null;
  onPlayAgain: () => void;
  onHome: () => void;
}

const PLAYER_COLORS: Record<number, string> = {
  1: "#4f8ef7",
  2: "#e85c5c",
  3: "#4cbe8a",
  4: "#f0a030",
};

const CONFETTI_COLORS = ["#4f8ef7", "#e85c5c", "#4cbe8a", "#f0a030", "#a78bfa", "#f472b6"];

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
}

export default function GameOverModal({ gameState, myPlayerId, onPlayAgain, onHome }: Props) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [visible, setVisible] = useState(false);

  const winner = gameState.players.find((p) => p.id === gameState.winner);
  const isWinner = myPlayerId !== null && gameState.winner === myPlayerId;
  const winColor = winner ? PLAYER_COLORS[winner.id] : "#4f8ef7";

  // Entrance delay
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  // Spawn confetti
  useEffect(() => {
    if (!visible) return;
    const ps: Particle[] = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: -10,
      vx: (Math.random() - 0.5) * 2,
      vy: 1.5 + Math.random() * 2,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: 6 + Math.random() * 8,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
    }));
    setParticles(ps);
  }, [visible]);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      {/* Confetti */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              borderRadius: "2px",
              transform: `rotate(${p.rotation}deg)`,
              animation: `fall ${2 + Math.random()}s linear forwards`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes fall {
          to { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
      `}</style>

      {/* Card */}
      <div
        className={`animate-slide-up relative bg-gray-900 border rounded-2xl p-8 w-80 flex flex-col items-center gap-5 text-center`}
        style={{ borderColor: `${winColor}55` }}
      >
        {/* Glow ring */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{ boxShadow: `0 0 40px ${winColor}33` }}
        />

        <div className="text-5xl">{isWinner ? "🏆" : "💀"}</div>

        <div>
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">
            {isWinner ? "You won!" : "Game over"}
          </p>
          <h2 className="text-2xl font-bold" style={{ color: winColor }}>
            {winner?.name ?? "Unknown"} wins!
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {gameState.moveCount} moves played
          </p>
        </div>

        <div className="flex flex-col gap-2 w-full mt-2">
          <button
            onClick={onPlayAgain}
            className="w-full py-3 rounded-xl font-semibold text-white transition-all hover:brightness-110"
            style={{ backgroundColor: winColor }}
          >
            Play Again
          </button>
          <button
            onClick={onHome}
            className="w-full py-2.5 rounded-xl font-semibold text-gray-400 border border-gray-700 hover:border-gray-500 hover:text-gray-200 transition-all"
          >
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}
