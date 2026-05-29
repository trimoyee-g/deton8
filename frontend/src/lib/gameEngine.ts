import type { Board, Cell, GameState, MoveResult, Player, PlayerConfig } from "./types";

// ─── Board helpers ──────────────────────────────────────────────────────────

export function createBoard(rows: number, cols: number): Board {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, (): Cell => ({ count: 0, player: 0 }))
  );
}

/**
 * Number of adjacent cells = the critical mass for (r, c).
 * Corner=2  Edge=3  Interior=4
 */
export function criticalMass(r: number, c: number, rows: number, cols: number): number {
  const edgeCount =
    (r === 0 || r === rows - 1 ? 1 : 0) + (c === 0 || c === cols - 1 ? 1 : 0);
  if (edgeCount === 2) return 2;
  if (edgeCount === 1) return 3;
  return 4;
}

export function getNeighbors(
  r: number,
  c: number,
  rows: number,
  cols: number
): [number, number][] {
  const n: [number, number][] = [];
  if (r > 0) n.push([r - 1, c]);
  if (r < rows - 1) n.push([r + 1, c]);
  if (c > 0) n.push([r, c - 1]);
  if (c < cols - 1) n.push([r, c + 1]);
  return n;
}

export function countOrbsForPlayer(board: Board, player: Player): number {
  let total = 0;
  for (const row of board) for (const cell of row) if (cell.player === player) total += cell.count;
  return total;
}

export function canPlaceOrb(board: Board, r: number, c: number, player: Player): boolean {
  const cell = board[r][c];
  return cell.player === 0 || cell.player === player;
}

// ─── Deep copy ──────────────────────────────────────────────────────────────

function cloneBoard(board: Board): Board {
  return board.map((row) => row.map((cell) => ({ ...cell })));
}

// ─── Explosion resolution (BFS) ─────────────────────────────────────────────

/**
 * Processes all chain reactions caused after placing an orb.
 * Mutates `board` in-place and records which cells exploded into `exploded`.
 */
function resolveExplosions(
  board: Board,
  currentPlayer: Player,
  rows: number,
  cols: number,
  exploded: Set<string>
): void {
  // Use an index pointer instead of shift() — shift() is O(n), pointer is O(1)
  const queue: [number, number][] = [];
  let head = 0;
  const MAX_ITER = 8000; // safety cap; genuine games never hit this

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c].count >= criticalMass(r, c, rows, cols)) {
        queue.push([r, c]);
      }
    }
  }

  while (head < queue.length && head < MAX_ITER) {
    const [r, c] = queue[head++];
    const cm = criticalMass(r, c, rows, cols);

    if (board[r][c].count < cm) continue;

    exploded.add(`${r},${c}`);

    board[r][c].count -= cm;
    if (board[r][c].count === 0) board[r][c].player = 0;

    for (const [nr, nc] of getNeighbors(r, c, rows, cols)) {
      board[nr][nc].count += 1;
      board[nr][nc].player = currentPlayer;

      if (board[nr][nc].count >= criticalMass(nr, nc, rows, cols)) {
        queue.push([nr, nc]);
      }
    }
  }
}

// ─── Next living player ──────────────────────────────────────────────────────

function nextAlivePlayer(
  board: Board,
  currentPlayer: Player,
  players: PlayerConfig[],
  newMoveCount: number
): Player {
  const idx = players.findIndex((p) => p.id === currentPlayer);
  for (let i = 1; i <= players.length; i++) {
    const next = players[(idx + i) % players.length];
    // In the first round every player is still "alive" (they haven't placed yet)
    if (newMoveCount < players.length || countOrbsForPlayer(board, next.id) > 0) {
      return next.id;
    }
  }
  return currentPlayer; // fallback – should not happen if the game is over
}

// ─── Core move function ──────────────────────────────────────────────────────

export function placeOrb(state: GameState, r: number, c: number): MoveResult {
  if (!canPlaceOrb(state.board, r, c, state.currentPlayer)) {
    return { state, exploded: new Set() };
  }

  const board = cloneBoard(state.board);
  const exploded = new Set<string>();

  // Place the orb
  board[r][c] = {
    count: board[r][c].count + 1,
    player: state.currentPlayer,
  };

  // Cascade
  resolveExplosions(board, state.currentPlayer, state.rows, state.cols, exploded);

  const newMoveCount = state.moveCount + 1;

  // Update player metadata
  const updatedPlayers: PlayerConfig[] = state.players.map((p) => {
    const orbCount = countOrbsForPlayer(board, p.id);
    const alive =
      orbCount > 0 || newMoveCount < state.players.length; // keep alive until first round finishes
    return { ...p, orbCount, alive };
  });

  // Check for winner: only after every player has placed at least once
  let winner: Player | null = null;
  if (newMoveCount >= state.players.length) {
    const playersWithOrbs = updatedPlayers.filter((p) => p.orbCount > 0);
    if (playersWithOrbs.length === 1) {
      winner = playersWithOrbs[0].id;
    }
  }

  const next = winner
    ? state.currentPlayer
    : nextAlivePlayer(board, state.currentPlayer, state.players, newMoveCount);

  const newState: GameState = {
    ...state,
    board,
    currentPlayer: next,
    players: updatedPlayers,
    moveCount: newMoveCount,
    winner,
    status: winner ? "finished" : "playing",
  };

  return { state: newState, exploded };
}

// ─── Game initialisation ─────────────────────────────────────────────────────

export function initGame(
  players: Omit<PlayerConfig, "orbCount" | "alive">[],
  rows: number,
  cols: number
): GameState {
  return {
    board: createBoard(rows, cols),
    currentPlayer: players[0].id as Player,
    players: players.map((p) => ({ ...p, orbCount: 0, alive: true })),
    status: "playing",
    winner: null,
    moveCount: 0,
    rows,
    cols,
  };
}

// ─── All valid moves for a player ────────────────────────────────────────────

export function validMoves(board: Board, player: Player): [number, number][] {
  const moves: [number, number][] = [];
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[0].length; c++) {
      if (canPlaceOrb(board, r, c, player)) moves.push([r, c]);
    }
  }
  return moves;
}
