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
# Run Biome linter across the repository (0 errors)
pnpm lint

# Run TypeScript typechecks across all 9 workspaces (0 errors)
pnpm typecheck

# Execute Vitest test suites (315 tests across 35 test suites, 100% passing)
pnpm test

# Build all production workspaces (web, admin, and @et-chess/api)
pnpm build
```

---

## ⚡ Real-Time Architecture & Hardened Security Boundary

ET-Chess delivers production-grade online multiplayer infrastructure powered by Cloudflare Workers and Durable Objects:

- **Server-Authoritative Game Rooms (`GameRoomDO`)**:
  - Authoritative chess clocks with millisecond precision, configurable time controls (Bullet, Blitz, Rapid), and move increments.
  - Recalculating Durable Object alarms (`ctx.storage.setAlarm`) for exact timeout enforcement and disconnect grace periods.
  - Cloudflare WebSocket Hibernation API (`ctx.acceptWebSocket`) zeroing memory consumption between player moves.
  - Multi-connection management, reconnect state synchronization, and strict lifecycle states (`WAITING`, `ACTIVE`, `COMPLETED`, `ABORTED`).
  - Exactly-once idempotent D1 SQLite persistence of completed games with PGN records, outcome timestamps, and rating adjustments.
  - Direct authoritative match result reporting to `TournamentDO`.

- **Ranked Matchmaking & Rating System (`MatchmakerDO`)**:
  - Durable in-memory queue with expanding rating window: initial base window of $\pm200$ Elo expanding by $+50$ Elo every 15 seconds.
  - Standard FIDE Elo rating calculation ($K=32$, floor of 100 Elo) atomically applied to player profiles.
  - WebSocket queue notification with real-time pairing and instant game room provisioning.
  - Atomic reservation lifecycle preventing matchmaker double-pairing or queue dropouts.

- **Friend Challenge Rooms**:
  - Cryptographically secure 6-character room codes (`ABC12D`) generated via `crypto.getRandomValues`.
  - Configurable time controls and cryptographically uniform color assignment.
  - Single-use, short-lived game tickets for WebSocket authentication, strictly validating participant identity.

- **Single-Elimination Tournament Coordinator (`TournamentDO`)**:
  - Power-of-2 bracket sizing ($N = 2^{\lceil\log_2 P\rceil}$) with automatic bye advancement for odd player counts.
  - Automatic `GameRoomDO` provisioning per scheduled match.
  - Draw tiebreak resolution (higher seed advances).
  - Automated round-by-round progression, finals match provisioning, and champion crowning.

- **Security & Abuse Protection**:
  - Better Auth canonical `user.id` identity across all sensitive routes and WebSocket connections.
  - Strict production secrets enforcement (`BETTER_AUTH_SECRET` minimum 32 characters or fatal boot error).
  - WebSocket message size limit (16KB max payload) and safe Zod schema validation.
  - Production error sanitization (no internal database errors or stack traces leaked to clients).
  - Strict CORS allowlist matching configured production domains.

---

## 📜 Compliance & Third-Party Licenses

ET-Chess incorporates Stockfish (distributed under the GNU General Public License v3). Stockfish is isolated across process/Worker boundaries and communicates strictly over the standard text-based UCI protocol.

Full licensing inventory, copyright attributions, and GPLv3 compliance details are documented in [docs/compliance/licenses.md](file:///Users/hunwork/Documents/Projects%20/ET-Chess/docs/compliance/licenses.md).

---

## 📜 License

Private repository — all rights reserved.

