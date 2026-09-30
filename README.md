# ET Chess

A modern, high-performance chess platform built as a TypeScript monorepo with Turborepo and pnpm workspaces.

ET Chess provides web and mobile experiences powered by a shared core chess engine, native and web Stockfish bots, an admin management dashboard, and a Cloudflare Workers backend.

---

## 🏗 Architecture & Workspace Layout

```
ET-Chess/
├── apps/
│   ├── web/        # React 19 + Vite web client (Chessboard, local/bot play, online rooms, matchmaking, tournaments)
│   ├── mobile/     # Expo SDK 57 + React Native cross-platform mobile app (local, bot, online lobby & brackets)
│   └── admin/      # TanStack Router + Query dashboard (overview, moderation, live rooms, tournaments)
├── services/
│   └── api/        # Cloudflare Workers API + Durable Objects (GameRoomDO, MatchmakerDO, TournamentDO, Better Auth)
├── packages/
│   ├── chess-core/         # Canonical chess rules engine, move validation, FEN/SAN, Elo rating calculation
│   ├── realtime-protocol/  # Shared WebSocket message contracts, Zod schemas, types, and client wrapper
│   ├── bot-engine/         # Stockfish UCI bridge and difficulty-tiered bot controller
│   ├── types/              # Shared domain models and TypeScript interfaces
│   └── config/             # Shared Tailwind presets and TypeScript base configs
└── .github/
    └── workflows/  # GitHub Actions CI pipeline
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v22+
- **pnpm**: v11+
- **Volta** (optional, recommended)

### Installation

```bash
pnpm install
```

### Development

Run all applications and services simultaneously:

```bash
pnpm dev
```

Or target specific packages/apps:

```bash
# Web Application
pnpm --filter web dev

# Mobile Application (Expo)
pnpm --filter mobile start

# Admin Dashboard
pnpm --filter admin dev

# Cloudflare Workers API
pnpm --filter @et-chess/api dev
```

### Verification & Testing

```bash
# Run Biome linter across the repository
pnpm lint

# Run TypeScript typechecks across all workspaces
pnpm typecheck

# Execute Vitest test suites (240+ tests across monorepo)
pnpm test
```

---

## ⚡ Version 2.0 Real-Time Architecture

Version 2.0 delivers production-grade online multiplayer infrastructure powered by Cloudflare Workers and Durable Objects:

- **Server-Authoritative Game Rooms (`GameRoomDO`)**:
  - Cloudflare WebSocket Hibernation API (`ctx.acceptWebSocket`) zeroing memory consumption between player moves.
  - Strict turn enforcement, server-side legal move validation, resignations, draw agreements, and ping/pong heartbeats.
  - 60-second disconnect grace alarm (`ctx.storage.setAlarm`) allowing seamless reconnection before forfeiture.
  - D1 SQLite persistence of completed games with PGN records, outcome timestamps, and rating adjustments.

- **Ranked Matchmaking & Rating System (`MatchmakerDO`)**:
  - Expanding rating window queue: initial base window of $\pm200$ Elo expanding by $+50$ Elo every 15 seconds.
  - Standard FIDE Elo rating calculation ($K=32$, floor of 100 Elo) atomically applied to player profiles.
  - WebSocket queue notification with real-time pairing and instant game room provisioning.

- **Friend Challenge Rooms**:
  - 6-character alphanumeric room codes (`ABC12D`) with collision retry logic.
  - Configurable time controls (Blitz, Rapid, Classical) and color preferences (White, Black, Random).
  - Shareable join links and instant lobby ready-state synchronization.

- **Single-Elimination Tournament Coordinator (`TournamentDO`)**:
  - Power-of-2 bracket sizing ($N = 2^{\lceil\log_2 P\rceil}$) with automatic bye advancement for odd player counts.
  - Random and rating-based seeding strategies.
  - Automated round-by-round progression, match provisioning, and champion crowning.
  - Full interactive bracket visualization across Web and Mobile.

- **Authentication & User Profiles**:
  - Better Auth integration with D1 SQLite persistence.
  - Email/password authentication, session management, and guest fallback.
  - Cross-platform auth modal and status indicator in Web, Mobile, and API middleware.

- **Admin Visibility & Operations**:
  - Real-time room inspection and active match monitoring.
  - Tournament status tracking, bracket inspection, and participant metrics.
  - Moderation queue with user infraction reports.

---

## 🗺 Roadmap

- **v1.0 (Completed)**: 
  - Monorepo architecture & shared packages (`chess-core`, `bot-engine`, `types`).
  - Web and Expo mobile apps with local game loop, responsive board, move validation, sound, and theme styling.
  - Bot integration with multi-tier difficulty levels (Beginner, Intermediate, Advanced, Master).
  - Admin dashboard with Hono RPC integration.
  - Cloudflare Workers REST API with D1 / Drizzle schema.
- **v2.0 (Completed)**: 
  - Real-time online play via Cloudflare Durable Objects & WebSockets (Hibernation API).
  - Expanding-window rated matchmaking queue with FIDE Elo rating calculations.
  - Friend-to-friend private challenge rooms with 6-char shareable invite codes.
  - Single-elimination tournament coordinator with power-of-2 brackets and byes.
  - Strict real-time protocol contract package (`@et-chess/realtime-protocol`).
  - Better Auth authentication and player profile management.
  - Admin monitoring dashboard for active rooms, tournaments, and live metrics.

---

## 📜 License

Private repository — all rights reserved.

