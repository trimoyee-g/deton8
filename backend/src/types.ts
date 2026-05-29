export type Player = 1 | 2 | 3 | 4;

export interface Cell {
  count: number;
  player: Player | 0;
}

export type Board = Cell[][];

export type GameStatus = "waiting" | "playing" | "finished";

export interface PlayerConfig {
  id: Player;
  name: string;
  color: string;
  isAI: boolean;
  orbCount: number;
  alive: boolean;
  socketId: string;
}

export interface GameState {
  board: Board;
  currentPlayer: Player;
  players: PlayerConfig[];
  status: GameStatus;
  winner: Player | null;
  moveCount: number;
  rows: number;
  cols: number;
}

export interface Room {
  code: string;
  hostSocketId: string;
  maxPlayers: number;
  state: GameState;
}
