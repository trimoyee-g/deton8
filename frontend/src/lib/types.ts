export type Player = 1 | 2 | 3 | 4;

export interface Cell {
  count: number;
  player: Player | 0;
}

export type Board = Cell[][];

export type GameMode = "hotseat" | "ai" | "online";

export type GameStatus = "playing" | "finished";

export type AIDifficulty = "easy" | "medium";

export interface PlayerConfig {
  id: Player;
  name: string;
  color: string;
  isAI: boolean;
  difficulty?: AIDifficulty;
  /** orbs currently on the board – updated each turn */
  orbCount: number;
  alive: boolean;
}

export interface GameState {
  board: Board;
  currentPlayer: Player;
  players: PlayerConfig[];
  status: GameStatus;
  winner: Player | null;
  /** total number of moves made across all players */
  moveCount: number;
  rows: number;
  cols: number;
}

export interface MoveResult {
  state: GameState;
  /** cells that exploded during chain resolution – "r,c" strings */
  exploded: Set<string>;
}

export const PLAYER_COLORS: Record<Player, string> = {
  1: "#4f8ef7",
  2: "#e85c5c",
  3: "#4cbe8a",
  4: "#f0a030",
};

export interface ChatMessage {
  id: string;
  playerId: number;
  playerName: string;
  color: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export const PLAYER_NAMES_DEFAULT: Record<Player, string> = {
  1: "Player 1",
  2: "Player 2",
  3: "Player 3",
  4: "Player 4",
};
