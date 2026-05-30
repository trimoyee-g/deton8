"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { getAIMove } from "@/lib/aiPlayer";
import { canPlaceOrb, initGame, placeOrb, skipTurn } from "@/lib/gameEngine";
import {
  playExplosion,
  playPlace,
  playTick,
  playTimeUp,
  playUndo,
  playUrgentTick,
  playWin,
} from "@/lib/soundEngine";
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
  timedMode?: boolean;
  timePerTurn?: number;
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
  timeLeft: number;
  timePerTurn: number;
  canUndo: boolean;
  sendChatMessage: (text: string) => void;
  handleCellClick: (r: number, c: number) => void;
  undo: () => void;
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
  const [history, setHistory] = useState<GameState[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timedMode, setTimedMode] = useState(config?.timedMode ?? false);
  const [timePerTurn, setTimePerTurn] = useState(config?.timePerTurn ?? 15);

  const animating = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function addMessage(msg: Partial<ChatMessage>) {
    setChatMessages((prev) => [...prev.slice(-99), makeMsg(msg)]);
  }

  // ─── Timer: reset + countdown whenever the current player changes ──────────
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (!timedMode || !gameState || gameState.status !== "playing") {
      setTimeLeft(0);
      return;
    }
    const currentCfg = gameState.players.find((p) => p.id === gameState.currentPlayer);
    if (currentCfg?.isAI) { setTimeLeft(0); return; }

    setTimeLeft(timePerTurn);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) return 0;
        if (prev <= 4) playUrgentTick();
        else playTick();
        return prev - 1;
      });
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timedMode, timePerTurn, gameState?.currentPlayer, gameState?.status]);

  // ─── Timer: fire skip when countdown hits 0 ────────────────────────────────
  useEffect(() => {
    if (timeLeft !== 0 || !timedMode || !gameState || gameState.status !== "playing") return;
    const currentCfg = gameState.players.find((p) => p.id === gameState.currentPlayer);
    if (currentCfg?.isAI) return;

    playTimeUp();

    if (config?.mode === "online") {
      // Only the player whose turn it is tells the server to skip
      if (myPlayerId === gameState.currentPlayer) {
        getSocket().emit("skipTurn");
      }
    } else {
      const skippedName = gameState.players.find((p) => p.id === gameState.currentPlayer)?.name ?? "Player";
      addMessage({ isSystem: true, color: "#888", playerName: "Game", text: `⏱ Time's up! ${skippedName} skipped.` });
      setGameState(skipTurn(gameState));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  // ─── Local initialisation ─────────────────────────────────────────────────
  useEffect(() => {
    if (!config || config.mode === "online") return;

    // config is read from sessionStorage after mount, so sync timed settings now
    setTimedMode(config.timedMode ?? false);
    setTimePerTurn(config.timePerTurn ?? 15);

    const state = initGame(config.players, config.rows, config.cols);
    setGameState(state);
    setMyPlayerId(1);
    setHistory([]);
    setChatMessages([]);

    addMessage({
      isSystem: true, color: "#666", playerName: "Game",
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

      playPlace();
      if (exploded.size > 0) setTimeout(() => playExplosion(exploded.size), 80);
      if (nextState.status === "finished") setTimeout(playWin, 400);

      setExplodedCells(exploded);
      setGameState(nextState);
      setTimeout(() => setExplodedCells(new Set()), 500);

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

  // ─── Online setup ─────────────────────────────────────────────────────────
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
          timedMode: config.timedMode ?? false,
          timePerTurn: config.timePerTurn ?? 15,
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

    socket.on("gameStarted", ({ state, timedMode: tm, timePerTurn: tpt }: { state: GameState; timedMode: boolean; timePerTurn: number }) => {
      setIsLobby(false);
      setWaitingFor(null);
      setGameState(state);
      // Sync timed settings for joining players who didn't configure them
      setTimedMode(tm);
      setTimePerTurn(tpt);
      addMessage({ isSystem: true, color: "#666", playerName: "Game", text: "Game started! Good luck 🎮" });
    });

    socket.on("gameStateUpdate", ({ state }: { state: GameState }) => {
      setGameState(state);
    });

    socket.on("newMessage", (msg: Omit<ChatMessage, "id">) => { addMessage(msg); });

    socket.on("playerLeft", ({ players, leftPlayerName }: { players: { name: string; id: number }[]; leftPlayerName?: string }) => {
      setLobbyPlayers(players);
      addMessage({ isSystem: true, color: "#f0a030", playerName: "Game", text: `${leftPlayerName ?? "A player"} left the game.` });
    });

    socket.on("error", ({ message }: { message: string }) => { setError(message); });

    socket.connect();

    return () => { socket.removeAllListeners(); disconnectSocket(); };
  }, [config]);

  // ─── Send chat ────────────────────────────────────────────────────────────
  const sendChatMessage = useCallback((text: string) => {
    if (!text.trim()) return;
    if (config?.mode === "online") { getSocket().emit("sendMessage", { text }); return; }
    const me = gameState?.players.find((p) => p.id === (myPlayerId ?? 1));
    addMessage({
      playerId: me?.id ?? 1,
      playerName: me?.name ?? "You",
      color: me?.color ?? "#4f8ef7",
      text: text.trim(),
    });
  }, [config, gameState, myPlayerId]);

  // ─── Cell click ───────────────────────────────────────────────────────────
  const handleCellClick = useCallback((r: number, c: number) => {
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

    // Save last state only — single undo
    setHistory([gameState]);

    const { state: nextState, exploded } = placeOrb(gameState, r, c);

    playPlace();
    if (exploded.size > 0) setTimeout(() => playExplosion(exploded.size), 80);
    if (nextState.status === "finished") setTimeout(playWin, 400);

    setExplodedCells(exploded);
    setGameState(nextState);

    setTimeout(() => {
      setExplodedCells(new Set());
      animating.current = false;
    }, 500);
  }, [gameState, config, myPlayerId]);

  // ─── Undo ─────────────────────────────────────────────────────────────────
  const undo = useCallback(() => {
    if (history.length === 0) return;
    playUndo();
    const target = history[0];
    setHistory([]); // clear — only one undo allowed
    setGameState(target);
    // Do NOT reset the timer — the clock keeps running from where it was
  }, [history]);

  // ─── Reset ────────────────────────────────────────────────────────────────
  const resetGame = useCallback(() => {
    if (!config || config.mode === "online") return;
    const state = initGame(config.players, config.rows, config.cols);
    setGameState(state);
    setExplodedCells(new Set());
    setHistory([]);
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
    timeLeft,
    timePerTurn,
    canUndo: history.length > 0 && config?.mode !== "online",
    sendChatMessage,
    handleCellClick,
    undo,
    resetGame,
  };
}
