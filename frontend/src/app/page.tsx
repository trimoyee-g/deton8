"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PLAYER_COLORS, type AIDifficulty, type GameMode, type Player } from "@/lib/types";

const MODES = [
  {
    id: "hotseat" as GameMode,
    label: "Hot Seat",
    icon: "👥",
    desc: "2–4 players on one device",
  },
  {
    id: "ai" as GameMode,
    label: "vs Computer",
    icon: "🤖",
    desc: "Play against the AI",
  },
  {
    id: "online" as GameMode,
    label: "Online",
    icon: "🌐",
    desc: "Real-time multiplayer",
  },
];

interface PlayerSetup {
  name: string;
  isAI: boolean;
  difficulty: AIDifficulty;
}

const DEFAULT_PLAYERS: PlayerSetup[] = [
  { name: "Player 1", isAI: false, difficulty: "medium" },
  { name: "Player 2", isAI: false, difficulty: "medium" },
  { name: "Player 3", isAI: false, difficulty: "medium" },
  { name: "Player 4", isAI: false, difficulty: "medium" },
];

export default function HomePage() {
  const router = useRouter();
  const [mode, setMode] = useState<GameMode | null>(null);
  const [playerCount, setPlayerCount] = useState(2);
  const [players, setPlayers] = useState<PlayerSetup[]>(DEFAULT_PLAYERS.map((p) => ({ ...p })));
  const [rows] = useState(6);
  const [cols] = useState(9);

  // Online-specific state
  const [onlineStep, setOnlineStep] = useState<"lobby" | "create" | "join">("lobby");
  const [roomCode, setRoomCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [onlineName, setOnlineName] = useState("Player 1");

  function updatePlayer(idx: number, updates: Partial<PlayerSetup>) {
    setPlayers((prev) => prev.map((p, i) => (i === idx ? { ...p, ...updates } : p)));
  }

  function startLocalGame() {
    const config = {
      mode,
      rows,
      cols,
      players: players.slice(0, playerCount).map((p, i) => ({
        id: (i + 1) as Player,
        name: p.name || `Player ${i + 1}`,
        color: PLAYER_COLORS[(i + 1) as Player],
        isAI: p.isAI,
        difficulty: p.difficulty,
      })),
    };
    sessionStorage.setItem("gameConfig", JSON.stringify(config));
    router.push("/game");
  }

  function startAIGame() {
    const config = {
      mode: "ai",
      rows,
      cols,
      players: [
        {
          id: 1 as Player,
          name: players[0].name || "You",
          color: PLAYER_COLORS[1],
          isAI: false,
          difficulty: "medium",
        },
        {
          id: 2 as Player,
          name: "CPU",
          color: PLAYER_COLORS[2],
          isAI: true,
          difficulty: players[1].difficulty,
        },
      ],
    };
    sessionStorage.setItem("gameConfig", JSON.stringify(config));
    router.push("/game");
  }

  // ─── Online lobby ──────────────────────────────────────────────────────────
  function goCreateRoom() {
    const config = {
      mode: "online",
      rows,
      cols,
      playerCount,
      playerName: onlineName,
      action: "create",
    };
    sessionStorage.setItem("gameConfig", JSON.stringify(config));
    router.push("/game");
  }

  function goJoinRoom() {
    if (!joinCode.trim()) return;
    const config = {
      mode: "online",
      rows,
      cols,
      playerName: onlineName,
      action: "join",
      roomCode: joinCode.toUpperCase(),
    };
    sessionStorage.setItem("gameConfig", JSON.stringify(config));
    router.push("/game");
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      {/* Title */}
      <div className="mb-10 text-center">
        <h1 className="text-5xl font-bold tracking-tight mb-2 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          Chain Reaction
        </h1>
        <p className="text-gray-500 text-sm">Place orbs. Reach critical mass. Explode.</p>
      </div>

      {/* Mode selection */}
      {!mode && (
        <div className="animate-fade-in flex flex-col items-center gap-6 w-full max-w-md">
          <p className="text-gray-400 text-sm uppercase tracking-widest">Choose a mode</p>
          <div className="grid grid-cols-3 gap-3 w-full">
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className="flex flex-col items-center gap-2 p-5 rounded-xl border border-gray-700 bg-gray-900 hover:border-blue-500 hover:bg-gray-800 transition-all duration-150 group"
              >
                <span className="text-3xl">{m.icon}</span>
                <span className="font-semibold text-sm text-gray-200 group-hover:text-white">
                  {m.label}
                </span>
                <span className="text-xs text-gray-500 text-center leading-tight">{m.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Hot Seat setup */}
      {mode === "hotseat" && (
        <div className="animate-fade-in w-full max-w-md flex flex-col gap-5">
          <button
            onClick={() => setMode(null)}
            className="text-gray-500 hover:text-gray-300 text-sm self-start"
          >
            ← back
          </button>
          <h2 className="text-lg font-semibold">Hot Seat Setup</h2>

          {/* Player count */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400 w-28">Players</span>
            <div className="flex gap-2">
              {[2, 3, 4].map((n) => (
                <button
                  key={n}
                  onClick={() => setPlayerCount(n)}
                  className={`w-10 h-10 rounded-lg text-sm font-semibold border transition-all ${
                    playerCount === n
                      ? "bg-blue-600 border-blue-500 text-white"
                      : "border-gray-700 text-gray-400 hover:border-gray-500"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Player names */}
          <div className="flex flex-col gap-2">
            {players.slice(0, playerCount).map((p, i) => (
              <div key={i} className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: PLAYER_COLORS[(i + 1) as Player] }}
                />
                <input
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  value={p.name}
                  onChange={(e) => updatePlayer(i, { name: e.target.value })}
                  placeholder={`Player ${i + 1}`}
                />
              </div>
            ))}
          </div>

          <button
            onClick={startLocalGame}
            className="mt-2 w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold transition-all"
          >
            Start Game
          </button>
        </div>
      )}

      {/* vs AI setup */}
      {mode === "ai" && (
        <div className="animate-fade-in w-full max-w-md flex flex-col gap-5">
          <button
            onClick={() => setMode(null)}
            className="text-gray-500 hover:text-gray-300 text-sm self-start"
          >
            ← back
          </button>
          <h2 className="text-lg font-semibold">vs Computer</h2>

          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full bg-p1 flex-shrink-0" />
            <input
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              value={players[0].name}
              onChange={(e) => updatePlayer(0, { name: e.target.value })}
              placeholder="Your name"
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400 w-28">Difficulty</span>
            <div className="flex gap-2">
              {(["easy", "medium"] as AIDifficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => updatePlayer(1, { difficulty: d })}
                  className={`px-5 py-2 rounded-lg text-sm font-semibold border transition-all capitalize ${
                    players[1].difficulty === d
                      ? "bg-blue-600 border-blue-500 text-white"
                      : "border-gray-700 text-gray-400 hover:border-gray-500"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={startAIGame}
            className="mt-2 w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold transition-all"
          >
            Start Game
          </button>
        </div>
      )}

      {/* Online lobby */}
      {mode === "online" && (
        <div className="animate-fade-in w-full max-w-md flex flex-col gap-5">
          <button
            onClick={() => {
              setMode(null);
              setOnlineStep("lobby");
            }}
            className="text-gray-500 hover:text-gray-300 text-sm self-start"
          >
            ← back
          </button>

          <h2 className="text-lg font-semibold">Online Multiplayer</h2>

          {/* Name always shown */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400 w-28">Your name</span>
            <input
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              value={onlineName}
              onChange={(e) => setOnlineName(e.target.value)}
              placeholder="Your name"
            />
          </div>

          {onlineStep === "lobby" && (
            <div className="flex gap-3">
              <button
                onClick={() => setOnlineStep("create")}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold transition-all"
              >
                Create Room
              </button>
              <button
                onClick={() => setOnlineStep("join")}
                className="flex-1 py-3 border border-gray-600 hover:border-gray-400 rounded-xl font-semibold transition-all"
              >
                Join Room
              </button>
            </div>
          )}

          {onlineStep === "create" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-400 w-28">Room size</span>
                <div className="flex gap-2">
                  {[2, 3, 4].map((n) => (
                    <button
                      key={n}
                      onClick={() => setPlayerCount(n)}
                      className={`w-10 h-10 rounded-lg text-sm font-semibold border transition-all ${
                        playerCount === n
                          ? "bg-blue-600 border-blue-500 text-white"
                          : "border-gray-700 text-gray-400 hover:border-gray-500"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={goCreateRoom}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold transition-all"
              >
                Create & Wait for Players
              </button>
              <button
                onClick={() => setOnlineStep("lobby")}
                className="text-gray-500 hover:text-gray-300 text-sm text-center"
              >
                cancel
              </button>
            </div>
          )}

          {onlineStep === "join" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-400 w-28">Room code</span>
                <input
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm tracking-widest uppercase focus:outline-none focus:border-blue-500"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 5))}
                  placeholder="ABCDE"
                  maxLength={5}
                />
              </div>
              <button
                onClick={goJoinRoom}
                disabled={joinCode.length < 5}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-xl font-semibold transition-all"
              >
                Join Room
              </button>
              <button
                onClick={() => setOnlineStep("lobby")}
                className="text-gray-500 hover:text-gray-300 text-sm text-center"
              >
                cancel
              </button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
