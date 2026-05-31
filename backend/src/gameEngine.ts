import type { Board, Cell, GameState, Player, PlayerConfig } from "./types";

export function createBoard(rows: number, cols: number): Board {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, (): Cell => ({ count: 0, player: 0 })),
  );
}

export function criticalMass(
  r: number,
  c: number,
  rows: number,
  cols: number,
): number {
  const e =
    (r === 0 || r === rows - 1 ? 1 : 0) + (c === 0 || c === cols - 1 ? 1 : 0);
  if (e === 2) return 2;
  if (e === 1) return 3;
  return 4;
}

export function getNeighbors(
  r: number,
  c: number,
  rows: number,
  cols: number,
): [number, number][] {
  const n: [number, number][] = [];
  if (r > 0) n.push([r - 1, c]);
  if (r < rows - 1) n.push([r + 1, c]);
  if (c > 0) n.push([r, c - 1]);
  if (c < cols - 1) n.push([r, c + 1]);
  return n;
}

export function countOrbsForPlayer(board: Board, player: Player): number {
  let t = 0;
  for (const row of board)
    for (const cell of row) if (cell.player === player) t += cell.count;
  return t;
}

export function canPlaceOrb(
  board: Board,
  r: number,
  c: number,
  player: Player,
): boolean {
  return board[r][c].player === 0 || board[r][c].player === player;
}

function cloneBoard(b: Board): Board {
  return b.map((row) => row.map((cell) => ({ ...cell })));
}

function resolveExplosions(
  board: Board,
  player: Player,
  rows: number,
  cols: number,
  r: number,
  c: number,
): void {
  if (board[r][c].count < criticalMass(r, c, rows, cols)) return;
  const queue: [number, number][] = [];
  let head = 0;
  const MAX_ITER = 8000;
  queue.push([r, c]);
  while (head < queue.length && head < MAX_ITER) {
    const [r, c] = queue[head++];
    const cm = criticalMass(r, c, rows, cols);
    if (board[r][c].count < cm) continue;
    board[r][c].count -= cm;
    if (board[r][c].count === 0) board[r][c].player = 0;
    for (const [nr, nc] of getNeighbors(r, c, rows, cols)) {
      board[nr][nc].count += 1;
      board[nr][nc].player = player;
      if (board[nr][nc].count >= criticalMass(nr, nc, rows, cols))
        queue.push([nr, nc]);
    }
  }
}

function nextAlive(
  cur: Player,
  players: PlayerConfig[],
  moves: number,
): Player {
  const idx = players.findIndex((p) => p.id === cur);
  for (let i = 1; i <= players.length; i++) {
    const next = players[(idx + i) % players.length];
    if (moves < players.length || next.orbCount > 0) return next.id;
  }
  return cur;
}

export function applyMove(state: GameState, r: number, c: number): GameState {
  if (!canPlaceOrb(state.board, r, c, state.currentPlayer)) return state;

  const board = cloneBoard(state.board);
  board[r][c] = { count: board[r][c].count + 1, player: state.currentPlayer };
  resolveExplosions(board, state.currentPlayer, state.rows, state.cols, r, c);

  const newMoveCount = state.moveCount + 1;

  const counts = new Map<Player, number>();

  for (const row of board) {
    for (const cell of row) {
      if (cell.player !== 0) {
        counts.set(cell.player, (counts.get(cell.player) ?? 0) + cell.count);
      }
    }
  }
  const updatedPlayers = state.players.map((p) => ({
    ...p,
    orbCount: counts.get(p.id) ?? 0,
    alive: (counts.get(p.id) ?? 0) > 0 || newMoveCount < state.players.length,
  }));

  let winner: Player | null = null;
  if (newMoveCount >= state.players.length) {
    const alive = updatedPlayers.filter((p) => p.orbCount > 0);
    if (alive.length === 1) winner = alive[0].id;
  }

  const next = winner
    ? state.currentPlayer
    : nextAlive(state.currentPlayer, updatedPlayers, newMoveCount);

  return {
    ...state,
    board,
    currentPlayer: next,
    players: updatedPlayers,
    moveCount: newMoveCount,
    winner,
    status: winner ? "finished" : "playing",
  };
}

export function skipTurn(state: GameState): GameState {
  const newMoveCount = state.moveCount + 1;
  const next = nextAlive(state.currentPlayer, state.players, newMoveCount);
  return { ...state, currentPlayer: next, moveCount: newMoveCount };
}

export function initGame(
  players: PlayerConfig[],
  rows: number,
  cols: number,
): GameState {
  return {
    board: createBoard(rows, cols),
    currentPlayer: players[0].id,
    players: players.map((p) => ({ ...p, orbCount: 0, alive: true })),
    status: "playing",
    winner: null,
    moveCount: 0,
    rows,
    cols,
  };
}
