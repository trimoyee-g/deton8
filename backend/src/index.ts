import cors from "cors";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import * as roomManager from "./roomManager";

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  transports: ["websocket", "polling"],
});

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/", (_req, res) => res.json({ status: "ok", game: "Chain Reaction" }));

// ─── Socket.io events ────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log(`[+] ${socket.id} connected`);

  // ── Create room ─────────────────────────────────────────────────────────────
  socket.on(
    "createRoom",
    ({
      playerName,
      playerCount,
      rows,
      cols,
      timedMode,
      timePerTurn,
    }: {
      playerName: string;
      playerCount: number;
      rows: number;
      cols: number;
      timedMode: boolean;
      timePerTurn: number;
    }) => {
      try {
        const room = roomManager.createRoom(socket.id, playerName, playerCount, rows, cols, timedMode, timePerTurn);
        socket.join(room.code);
        socket.emit("roomCreated", {
          roomCode: room.code,
          playerId: 1,
          players: room.state.players,
        });
        console.log(`Room ${room.code} created by ${socket.id}`);
      } catch (e) {
        socket.emit("error", { message: "Could not create room." });
      }
    }
  );

  // ── Join room ────────────────────────────────────────────────────────────────
  socket.on("joinRoom", ({ roomCode, playerName }: { roomCode: string; playerName: string }) => {
    const result = roomManager.joinRoom(socket.id, roomCode.toUpperCase(), playerName);
    if (!result.success) {
      socket.emit("error", { message: result.error });
      return;
    }

    const normalized = roomCode.toUpperCase();
    socket.join(normalized);
    socket.emit("joinedRoom", { playerId: result.playerId });

    // Broadcast updated player list to the room
    io.to(normalized).emit("roomUpdate", {
      players: result.room.state.players,
      maxPlayers: result.room.maxPlayers,
    });

    console.log(`${socket.id} joined room ${roomCode} as P${result.playerId}`);

    // Auto-start when full
    if (result.room.state.players.length === result.room.maxPlayers) {
      const gameState = roomManager.startGame(roomCode);
      if (gameState) {
        io.to(roomCode).emit("gameStarted", {
          state: gameState,
          timedMode: result.room.timedMode,
          timePerTurn: result.room.timePerTurn,
        });
      }
    }
  });

  // ── Start game manually (host) ───────────────────────────────────────────────
  socket.on("startGame", ({ roomCode }: { roomCode: string }) => {
    const room = roomManager.getRoomBySocket(socket.id);
    if (!room || room.hostSocketId !== socket.id) {
      socket.emit("error", { message: "Only the host can start the game." });
      return;
    }
    if (room.state.players.length < 2) {
      socket.emit("error", { message: "Need at least 2 players." });
      return;
    }
    const gameState = roomManager.startGame(roomCode);
    if (gameState) {
      io.to(roomCode).emit("gameStarted", {
        state: gameState,
        timedMode: room.timedMode,
        timePerTurn: room.timePerTurn,
      });
    }
  });

  // ── Make a move ──────────────────────────────────────────────────────────────
  socket.on("makeMove", ({ r, c }: { r: number; c: number }) => {
    const result = roomManager.makeMove(socket.id, r, c);
    if (!result.success) {
      socket.emit("error", { message: result.error });
      return;
    }

    const room = roomManager.getRoomBySocket(socket.id);
    if (!room) return;

    io.to(room.code).emit("gameStateUpdate", { state: result.state });

    if (result.state.winner !== null) {
      const winnerName =
        result.state.players.find((p) => p.id === result.state.winner)?.name ?? "Unknown";
      io.to(room.code).emit("gameOver", { winner: result.state.winner, winnerName });
    }
  });

  // ── Skip turn (timed mode) ───────────────────────────────────────────────────
  socket.on("skipTurn", () => {
    const result = roomManager.skipTurnInRoom(socket.id);
    if (!result.success) return;
    io.to(result.room.code).emit("gameStateUpdate", { state: result.state });
  });

  // ── Chat ─────────────────────────────────────────────────────────────────────
  socket.on("sendMessage", ({ text }: { text: string }) => {
    const room = roomManager.getRoomBySocket(socket.id);
    if (!room) return;

    const player = room.state.players.find((p) => p.socketId === socket.id);
    if (!player) return;

    const trimmed = text.trim().slice(0, 200); // cap length
    if (!trimmed) return;

    io.to(room.code).emit("newMessage", {
      playerId: player.id,
      playerName: player.name,
      color: player.color,
      text: trimmed,
      timestamp: Date.now(),
    });
  });

  // ── Disconnect ───────────────────────────────────────────────────────────────
  socket.on("disconnect", () => {
    console.log(`[-] ${socket.id} disconnected`);
    const leavingRoom = roomManager.getRoomBySocket(socket.id);
    const leavingPlayer = leavingRoom?.state.players.find((p) => p.socketId === socket.id);
    const result = roomManager.removePlayer(socket.id);
    if (result) {
      io.to(result.code).emit("playerLeft", {
        players: result.room.state.players,
        leftPlayerName: leavingPlayer?.name ?? "A player",
      });
      // Always sync game state so sidebar reflects departure
      if (result.room.state.status === "playing" || result.winner) {
        io.to(result.code).emit("gameStateUpdate", { state: result.room.state });
      }
      if (result.winner) {
        io.to(result.code).emit("gameOver", {
          winner: result.winner.id,
          winnerName: result.winner.name,
        });
      }
    }
  });
});

const PORT = parseInt(process.env.PORT ?? "4000", 10);
httpServer.listen(PORT, () => {
  console.log(`Deton8 backend running on http://localhost:${PORT}`);
});
