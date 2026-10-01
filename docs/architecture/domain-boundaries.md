# ET-Chess Domain Boundaries & Architecture Ownership

This document defines the architectural responsibilities, data flow, and ownership boundaries across the ET-Chess monorepo.

---

## 1. Monorepo Structure & Domain Ownership

```
ET-Chess/
├── packages/
│   ├── chess-core/          # Pure chess domain logic & rule validation
│   ├── realtime-protocol/   # Authoritative WebSocket schemas & message contracts
│   ├── types/               # Shared domain interfaces, time controls, models
│   ├── bot-engine/          # UCI protocol adapter & Stockfish Worker driver
│   └── config/              # Shared TypeScript & toolchain configuration
├── services/
│   └── api/                 # Cloudflare Worker, Durable Objects, D1 & Better Auth
└── apps/
    ├── web/                 # Web client (Vite, React, Tailwind)
    ├── mobile/              # Mobile client (Expo, React Native)
    └── admin/               # Administrative dashboard (Vite, React)
```

---

## 2. Package Domain Responsibilities

### `packages/chess-core`
- **Ownership:** Pure, side-effect-free chess logic.
- **Key Modules:**
  - Board representation & FEN parsing.
  - Legal move generation & move validation.
  - Check, checkmate, stalemate, insufficient material, and draw condition detection.
  - Server-authoritative Elo rating calculation functions.
- **Constraints:** Must NEVER depend on UI libraries, network protocols, or platform runtimes.

### `packages/realtime-protocol`
- **Ownership:** Strongly-typed contracts for client-server WebSocket communication.
- **Key Modules:**
  - Zod schemas for all client messages (`move`, `resign`, `draw-offer`, `draw-response`).
  - Zod schemas for all server messages (`state-sync`, `game-over`, `draw-offered`, `error`, `opponent-disconnected`, `opponent-reconnected`).
  - Safe parsers (`safeParseClientMessage`, `safeParseServerMessage`).
- **Constraints:** Enforces backward compatibility and maximum payload size limits.

### `packages/types`
- **Ownership:** Canonical TypeScript interfaces across frontend and backend boundaries.
- **Key Modules:**
  - Time controls (`TimeControl`, presets like Bullet, Blitz, Rapid).
  - Lifecycle states (`WAITING`, `ACTIVE`, `COMPLETED`, `ABORTED`).
  - Player profiles, game history, and tournament metadata.

### `packages/bot-engine`
- **Ownership:** Universal Chess Interface (UCI) protocol driver.
- **Key Modules:**
  - UCI command generation (`uci`, `isready`, `ucinewgame`, `position fen`, `go movetime`).
  - Engine output parsing (`bestmove`).
  - Difficulty tier mappings (Beginner, Intermediate, Advanced, Master).
  - Worker bridges for browser Web Worker (`Worker`) and React Native thread.

---

## 3. Service & Runtime Boundaries

### `services/api` (Cloudflare Workers & Durable Objects)
- **Hono API Layer:** REST endpoints for authentication, profile querying, room creation, tournament management, and report filing.
- **Better Auth Integration:** Canonical user authentication, sessions stored in SQLite/D1, cookie/header-based validation.
- **GameRoomDO (Durable Object):**
  - Authoritative clock timing (countdown, increments, timeout alarms).
  - Authoritative move execution and board state.
  - Multi-connection handling and disconnection grace periods.
  - Exactly-once game settlement into D1 database.
  - Result reporting to TournamentDO for tournament matches.
- **MatchmakerDO (Durable Object):**
  - In-memory persistent queue with rating window expansion.
  - Atomic reservation and transactional pairing.
  - Automatic `GameRoomDO` provisioning.
- **TournamentDO (Durable Object):**
  - Single-elimination bracket generation and round tracking.
  - Automatic `GameRoomDO` provisioning per match.
  - Draw tiebreak resolution (higher seed advances).
  - Authoritative result intake from `GameRoomDO`.

---

## 4. Frontend Application Boundaries

### `apps/web`
- Browser-based online and local chess gameplay.
- Stockfish in-browser WebAssembly engine execution.
- Web-based matchmaking lobby and tournament participation.

### `apps/mobile`
- iOS and Android mobile chess experience via Expo.
- Stockfish bot integration with native gesture handling.
- Reconnection and network status resilience.

### `apps/admin`
- Back-office review of moderation reports.
- Platform monitoring of active rooms, tournaments, and user statistics.
