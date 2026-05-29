import { applyMove, canPlaceOrb, initGame } from "./gameEngine";
import type { GameState, Player, PlayerConfig, Room } from "./types";

const COLORS: Record<number, string> = {
  1: "#4f8ef7",
  2: "#e85c5c",
  3: "#4cbe8a",
  4: "#f0a030",
};

const rooms = new Map<string, Room>();
/** Map from socketId → roomCode */
const socketRoom = new Map<string, string>();

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export function createRoom(
  hostSocketId: string,
  hostName: string,
  maxPlayers: number,
  rows: number,
  cols: number
): Room {
  let code = generateCode();
  while (rooms.has(code)) code = generateCode();

  const hostPlayer: PlayerConfig = {
    id: 1,
    name: hostName || "Player 1",
    color: COLORS[1],
    isAI: false,
    orbCount: 0,
    alive: true,
    socketId: hostSocketId,
  };

  const state: GameState = {
    board: [],
    currentPlayer: 1,
    players: [hostPlayer],
    status: "waiting",
    winner: null,
    moveCount: 0,
    rows,
    cols,
  };

  const room: Room = { code, hostSocketId, maxPlayers, state };
  rooms.set(code, room);
  socketRoom.set(hostSocketId, code);
  return room;
}

export function joinRoom(
  socketId: string,
  code: string,
  playerName: string
): { success: true; room: Room; playerId: Player } | { success: false; error: string } {
  const room = rooms.get(code);
  if (!room) return { success: false, error: "Room not found." };
  if (room.state.status !== "waiting") return { success: false, error: "Game already started." };
  if (room.state.players.length >= room.maxPlayers) return { success: false, error: "Room is full." };

  const playerId = (room.state.players.length + 1) as Player;
  const newPlayer: PlayerConfig = {
    id: playerId,
    name: playerName || `Player ${playerId}`,
    color: COLORS[playerId],
    isAI: false,
    orbCount: 0,
    alive: true,
    socketId,
  };

  room.state.players.push(newPlayer);
  socketRoom.set(socketId, code);
  return { success: true, room, playerId };
}

export function startGame(code: string): GameState | null {
  const room = rooms.get(code);
  if (!room || room.state.players.length < 2) return null;

  room.state = initGame(room.state.players, room.state.rows, room.state.cols);
  return room.state;
}

export function makeMove(
  socketId: string,
  r: number,
  c: number
): { success: true; state: GameState } | { success: false; error: string } {
  const code = socketRoom.get(socketId);
  if (!code) return { success: false, error: "Not in a room." };

  const room = rooms.get(code);
  if (!room) return { success: false, error: "Room not found." };
  if (room.state.status !== "playing") return { success: false, error: "Game not active." };

  const player = room.state.players.find((p) => p.socketId === socketId);
  if (!player) return { success: false, error: "Player not found." };
  if (player.id !== room.state.currentPlayer) return { success: false, error: "Not your turn." };
  if (!canPlaceOrb(room.state.board, r, c, player.id))
    return { success: false, error: "Invalid move." };

  room.state = applyMove(room.state, r, c);
  return { success: true, state: room.state };
}

export function removePlayer(socketId: string): { code: string; room: Room } | null {
  const code = socketRoom.get(socketId);
  if (!code) return null;
  socketRoom.delete(socketId);

  const room = rooms.get(code);
  if (!room) return null;

  // Remove player from list; if room is now empty, delete it
  room.state.players = room.state.players.filter((p) => p.socketId !== socketId);
  if (room.state.players.length === 0) {
    rooms.delete(code);
    return null;
  }

  // If the host disconnects, assign a new host
  if (room.hostSocketId === socketId && room.state.players.length > 0) {
    room.hostSocketId = room.state.players[0].socketId;
  }

  return { code, room };
}

export function getRoomBySocket(socketId: string): Room | undefined {
  const code = socketRoom.get(socketId);
  return code ? rooms.get(code) : undefined;
}
