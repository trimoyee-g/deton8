<div align="center">

# 💥 Deton8

**The classic Chain Reaction board game — reimagined for the web.**

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green?logo=node.js)](https://nodejs.org)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.6-black?logo=socket.io)](https://socket.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8?logo=tailwindcss)](https://tailwindcss.com)

*Place orbs. Reach critical mass. Explode.*

</div>

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Game Rules](#game-rules)
- [AI Implementation](#ai-implementation)
- [Docker](#docker)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)

---

## Overview

Deton8 is a full-stack implementation of the chain reaction board game. Players take turns placing orbs on a grid; when a cell hits its critical mass it explodes, sending orbs to neighbours and potentially triggering a cascade. The last player with orbs on the board wins.

Three modes are supported out of the box: **Hot Seat** (2–4 players, one screen), **vs Computer** (easy / medium AI), and **Online Multiplayer** (real-time via WebSockets and room codes).

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Browser (Next.js)                  │
│                                                     │
│   page.tsx ──► sessionStorage ──► game/page.tsx     │
│                                        │            │
│                                   useGame hook      │
│                                   /         \       │
│                         local modes         online mode
│                         /       \                │  │
│                   gameEngine   aiPlayer    socketClient
│                 (pure logic)   (greedy AI)       │  │
└──────────────────────────────────────────────────┼──┘
                                                   │
                                              WebSocket
                                            (Socket.io)
                                                   │
┌──────────────────────────────────────────────────┼──┐
│                Node.js Backend                   │  │
│                                                  │  │
│         Express + Socket.io server ◄─────────────┘  │
│                    │                                 │
│             roomManager                             │
│           (room & player state)                     │
│                    │                                 │
│              gameEngine                             │
│           (source of truth)                         │
└─────────────────────────────────────────────────────┘
```

**Hot Seat / vs Computer** — runs entirely in the browser. The backend is not involved.

**Online Multiplayer** — the browser sends moves to the backend over WebSockets. The backend runs `gameEngine.ts` as the authoritative source of truth and broadcasts state updates to all players in the room.

`gameEngine.ts` is **pure functions with no side effects** and is duplicated in both packages so each side can run it independently.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS + CSS custom properties |
| Real-time comms | Socket.io (client `4.6.2`) |
| Backend | Node.js + Express + Socket.io |
| Language | TypeScript (strict) throughout |
| Sound | Web Audio API (no dependencies) |
| 3D rendering | CSS `perspective` + `box-shadow` depth trick |
| AI | One-ply greedy with fast positional pre-filter |

---

## Features

- **Hot Seat** — 2–4 players take turns on the same screen
- **vs Computer** — Easy (random valid move) or Medium (greedy heuristic AI)
- **Online Multiplayer** — Real-time rooms with 5-letter codes; chat included
- **Timed mode** — Per-turn countdown (10 / 15 / 20 / 30 s) with an SVG ring indicator; auto-skip on timeout; works in all three modes
- **Disconnect handling** — If a player leaves mid-game, the remaining player is immediately declared the winner
- **Single Undo** — Roll back your last move (one undo per turn, clears after use; does not reset the timer)
- **Sound effects** — Procedural Web Audio: place, explode, tick, win
- **3D board** — CSS perspective with box-shadow depth walls and radial-gradient sphere orbs
- **In-game chat** — Collapsible panel, quick emoji reactions, AI taunts; own messages right-aligned
- **Win screen** — CSS confetti, player-colored glow ring, Play Again / Main Menu

---

## Game Rules

1. Players take turns placing one orb in any **empty cell** or a **cell they already own**.
2. Each cell has a **critical mass** equal to its number of adjacent cells:
   - Corner cell → 2 &nbsp;|&nbsp; Edge cell → 3 &nbsp;|&nbsp; Interior cell → 4
3. When a cell reaches critical mass it **explodes** — all its orbs spread to each neighbour, converting them to the current player's colour.
4. Chain reactions cascade until no cell is overloaded.
5. A player is **eliminated** once they have no orbs left (after everyone has placed their first orb).
6. Last player standing **wins**.

---

## AI Implementation

No LLM involved — pure combinatorial search.

**Easy**: picks a random valid move.

**Medium** (one-ply greedy):
1. Score every valid move with a fast positional heuristic (prefers cells near critical mass, punishes moves that hand the opponent an immediate chain).
2. Take the top 6 candidates by heuristic score.
3. Simulate each with the full `placeOrb` engine and score the resulting board state (own orbs − opponent orbs + weighted critical-mass cells).
4. Pick the move with the best simulated outcome.

The two-stage approach keeps AI latency under ~5 ms even on packed boards where there are 40+ valid moves.

---

## Docker

The fastest way to run Deton8 locally is with Docker Compose:

```bash
git clone https://github.com/your-username/deton8.git
cd deton8/chain-reaction
docker compose up --build
```

Then open [http://localhost:3000](http://localhost:3000).

> **Note:** `NEXT_PUBLIC_BACKEND_URL` is baked into the frontend bundle at build time.
> If your backend is hosted elsewhere, pass it as a build arg:
> ```bash
> docker compose build --build-arg NEXT_PUBLIC_BACKEND_URL=https://your-backend.com frontend
> ```

To run only the backend (e.g. if you're developing the frontend locally):

```bash
docker compose up backend
```

---

## Getting Started

### Prerequisites

- Node.js 18+

### Backend

```bash
cd chain-reaction/backend
npm install
npm run dev        # http://localhost:4000
```

For production:

```bash
npm run build
npm start
```

### Frontend

```bash
cd chain-reaction/frontend
npm install
npm run dev        # http://localhost:3000
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> For **Hot Seat** and **vs Computer** you only need the frontend running.
> For **Online** mode you need both running.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_BACKEND_URL` | `http://localhost:4000` | Backend WebSocket URL (set in frontend) |
| `PORT` | `4000` | Backend port |

---

## Deployment

### Frontend → Vercel

1. Push the repo to GitHub.
2. Import the repo in [Vercel](https://vercel.com). Set **Root Directory** to `chain-reaction/frontend`.
3. Add environment variable `NEXT_PUBLIC_BACKEND_URL` pointing to your deployed backend URL.
4. Deploy.

### Backend → Railway / Render / Fly.io

Any platform that runs a Node.js process works. Example for [Railway](https://railway.app):

1. Create a new project → Deploy from GitHub repo.
2. Set **Root Directory** to `chain-reaction/backend`.
3. Set start command: `npm start` (runs the compiled build).
4. Railway auto-assigns a public URL — paste it into Vercel's `NEXT_PUBLIC_BACKEND_URL`.

> Hot Seat and vs Computer work on the Vercel frontend alone (no backend needed).
