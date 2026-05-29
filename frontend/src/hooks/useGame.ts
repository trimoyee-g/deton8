"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { getAIMove } from "@/lib/aiPlayer";
import { canPlaceOrb, initGame, placeOrb } from "@/lib/gameEngine";
import { disconnectSocket, getSocket } from "@/lib/socketClient";
import type { ChatMessage, GameState, Player } from "@/lib/types";

export interface GameConfig {
  mode: "hotseat" | "ai" | "online";
  rows: number;
  cols: number;
  players: {
    id: Player;
    name: string;
    color: string;
    isAI: boolean;
    difficulty?: "easy" | "medium";
  }[];
  // Online only
  playerName?: string;
  playerCount?: number;
  action?: "create" | "join";
  roomCode?: string;
}

export interface UseGameReturn {
  gameState: GameState | null;
  myPlayerId: Player | null;
  explodedCells: Set<string>;
  roomCode: string | null;
  waitingFor: string | null;
  lobbyPlayers: { name: string; id: number }[];
  isLobby: boolean;
  error: string | null;
  chatMessages: ChatMessage[];
  sendChatMessage: (text: string) => void;
  handleCellClick: (r: number, c: number) => void;
  resetGame: () => void;
}

// ─── AI taunts ────────────────────────────────────────────────────────────────
const AI_TAUNTS_CHAIN = [
  "💥 Chain reaction! Did that hurt?",
  "Oops, was that yours? 😇",
  "Nothing personal 🤖",
  "Cascades are my love language 💥",
  "I calculated that 3 moves ago.",
];
const AI_TAUNTS_IDLE = [
  "Still thinking? 🤔",
  "I have all day...",
  "No pressure 😏",
];
const AI_TAUNTS_WIN = [
  "GG, no re. 🤖",
  "Perhaps try easy mode? 😬",
  "That was... educational for you.",
];

function randomFrom(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function makeMsg(overrides: Partial<ChatMessage>): ChatMessage {
  return {
    id: `${Date.now()}-${Math.random()}`,
    playerId: 0,
    playerName: "",
    color: "#888",
    text: "",
    timestamp: Date.now(),
    ...overrides,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useGame(config: GameConfig | null): UseGameReturn {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<Player | null>(null);
  const [explodedCells, setExplodedCells] = useState<Set<string>>(new Set());
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [waitingFor, setWaitingFor] = useState<string | null>(null);
  const [lobbyPlayers, setLobbyPlayers] = useState<{ name: string; id: number }[]>([]);
  const [isLobby, setIsLobby] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const animating = useRef(false);

  function addMessage(msg: Partial<ChatMessage>) {
    setChatMessages((prev) => [...prev.slice(-99), makeMsg(msg)]);
  }

  // ─── Local (hotseat / ai) initialisation ──────────────────────────────────
  useEffect(() => {
    if (!config || config.mode === "online") return;

    const state = initGame(config.players, config.rows, config.cols);
    setGameState(state);
    setMyPlayerId(1);

    // Welcome message
    addMessage({
      isSystem: true,
      color: "#666",
      playerName: "Game",
      text: config.mode === "ai"
        ? "You vs the machine. Good luck 🤖"
        : `${config.players.length}-player hot seat game started!`,
    });
  }, [config]);

  // ─── AI move + taunts ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!config || config.mode !== "ai" || !gameState || gameState.status === "finished") return;

    const currentPlayerCfg = gameState.players.find((p) => p.id === gameState.currentPlayer);
    if (!currentPlayerCfg?.isAI) return;

    const timeout = setTimeout(() => {
      const [ar, ac] = getAIMove(gameState, currentPlayerCfg.difficulty ?? "medium");
      const { state: nextState, exploded } = placeOrb(gameState, ar, ac);

      setExplodedCells(exploded);
      setGameState(nextState);
      setTimeout(() => setExplodedCells(new Set()), 500);

      // Taunt on big chain reaction (3+ cells exploded)
      if (exploded.size >= 3 && Math.random() < 0.65) {
        setTimeout(() => {
          addMessage({
            playerId: currentPlayerCfg.id,
            playerName: currentPlayerCfg.name,
            color: currentPlayerCfg.color,
            text: randomFrom(AI_TAUNTS_CHAIN),
          });
        }, 600);
      }

      // Win taunt
      if (nextState.status === "finished") {
        setTimeout(() => {
          addMessage({
            playerId: currentPlayerCfg.id,
            playerName: currentPlayerCfg.name,
            color: currentPlayerCfg.color,
            text: randomFrom(AI_TAUNTS_WIN),
          });
        }, 800);
      }
    }, 650);

    return () => clearTimeout(timeout);
  }, [gameState, config]);

  // ─── Online (Socket.io) setup ─────────────────────────────────────────────
  useEffect(() => {
    if (!config || config.mode !== "online") return;

    const socket = getSocket();

    socket.on("connect", () => {
      if (config.action === "create") {
        socket.emit("createRoom", {
          playerName: config.playerName ?? "Player 1",
          playerCount: config.playerCount ?? 2,
          rows: config.rows,
          cols: config.cols,
        });
      } else if (config.action === "join") {
        socket.emit("joinRoom", {
          roomCode: config.roomCode,
          playerName: config.playerName ?? "Player",
        });
      }
    });

    socket.on("roomCreated", ({ roomCode: code, players }: { roomCode: string; players: { name: string; id: number }[] }) => {
      setRoomCode(code);
      setMyPlayerId(1);
      setIsLobby(true);
      setLobbyPlayers(players);
      setWaitingFor(`Waiting for ${(config.playerCount ?? 2) - 1} more player(s)…`);
    });

    socket.on("joinedRoom", ({ playerId }: { playerId: Player }) => {
      setMyPlayerId(playerId);
      setIsLobby(true);
    });

    socket.on("roomUpdate", ({ players, maxPlayers }: { players: { name: string; id: number }[]; maxPlayers: number }) => {
      setLobbyPlayers(players);
      const remaining = maxPlayers - players.length;
      setWaitingFor(remaining > 0 ? `Waiting for ${remaining} more player(s)…` : "Starting…");
    });

    socket.on("gameStarted", ({ state }: { state: GameState }) => {
      setIsLobby(false);
      setWaitingFor(null);
      setGameState(state);
      addMessage({ isSystem: true, color: "#666", playerName: "Game", text: "Game started! Good luck 🎮" });
    });

    socket.on("gameStateUpdate", ({ state }: { state: GameState }) => {
      setGameState(state);
    });

    socket.on("newMessage", (msg: Omit<ChatMessage, "id">) => {
      addMessage(msg);
    });

    socket.on("playerLeft", ({ players }: { players: { name: string; id: number }[] }) => {
      setLobbyPlayers(players);
      addMessage({ isSystem: true, color: "#666", playerName: "Game", text: "A player left the room." });
    });

    socket.on("error", ({ message }: { message: string }) => {
      setError(message);
    });

    socket.connect();

    return () => {
      socket.removeAllListeners();
      disconnectSocket();
    };
  }, [config]);

  // ─── Send chat message ────────────────────────────────────────────────────
  const sendChatMessage = useCallback(
    (text: string) => {
      if (!text.trim()) return;

      if (config?.mode === "online") {
        getSocket().emit("sendMessage", { text });
        return;
      }

      // Local mode: just add to local chat
      const me = gameState?.players.find((p) => p.id === (myPlayerId ?? 1));
      addMessage({
        playerId: me?.id ?? 1,
        playerName: me?.name ?? "You",
        color: me?.color ?? "#4f8ef7",
        text: text.trim(),
      });
    },
    [config, gameState, myPlayerId]
  );

  // ─── Cell click handler ───────────────────────────────────────────────────
  const handleCellClick = useCallback(
    (r: number, c: number) => {
      if (!gameState || gameState.status === "finished" || animating.current) return;

      const currentCfg = gameState.players.find((p) => p.id === gameState.currentPlayer);
      if (currentCfg?.isAI) return;

      if (config?.mode === "online") {
        if (gameState.currentPlayer !== myPlayerId) return;
        getSocket().emit("makeMove", { r, c });
        return;
      }

      if (!canPlaceOrb(gameState.board, r, c, gameState.currentPlayer)) return;

      animating.current = true;
      const { state: nextState, exploded } = placeOrb(gameState, r, c);
      setExplodedCells(exploded);
      setGameState(nextState);
      setTimeout(() => {
        setExplodedCells(new Set());
        animating.current = false;
      }, 500);
    },
    [gameState, config, myPlayerId]
  );

  // ─── Reset ────────────────────────────────────────────────────────────────
  const resetGame = useCallback(() => {
    if (!config || config.mode === "online") return;
    const state = initGame(config.players, config.rows, config.cols);
    setGameState(state);
    setExplodedCells(new Set());
    setChatMessages([]);
  }, [config]);

  return {
    gameState,
    myPlayerId,
    explodedCells,
    roomCode,
    waitingFor,
    lobbyPlayers,
    isLobby,
    error,
    chatMessages,
    sendChatMessage,
    handleCellClick,
    resetGame,
  };
}
