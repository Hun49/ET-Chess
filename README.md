# ET Chess

A modern, high-performance chess platform built as a TypeScript monorepo with Turborepo and pnpm workspaces.

ET Chess provides web and mobile experiences powered by a shared core chess engine, native and web Stockfish bots, an admin management dashboard, and a Cloudflare Workers backend.

---

## 🏗 Architecture & Workspace Layout

```
ET-Chess/
├── apps/
│   ├── web/        # React 19 + Vite web client (Chessboard, local/bot play)
│   ├── mobile/     # Expo SDK 57 + React Native cross-platform mobile app
│   └── admin/      # TanStack Router + Query dashboard for moderation & metrics
├── services/
│   └── api/        # Cloudflare Workers API built with Hono and Drizzle ORM
├── packages/
│   ├── chess-core/ # Canonical chess rules engine, move validation, FEN/SAN (chess.js wrapper)
│   ├── bot-engine/ # Stockfish UCI bridge and difficulty-tiered bot controller
│   ├── types/      # Shared domain models and TypeScript interfaces
│   └── config/     # Shared Tailwind presets and TypeScript base configs
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

# Execute Vitest test suites
pnpm test
```

---

## 🗺 Roadmap

- **v1.0 (Completed)**: 
  - Monorepo architecture & shared packages (`chess-core`, `bot-engine`, `types`).
  - Web and Expo mobile apps with local game loop, responsive board, move validation, sound, and theme styling.
  - Bot integration with multi-tier difficulty levels (Beginner, Intermediate, Advanced, Master).
  - Admin dashboard with Hono RPC integration.
  - Cloudflare Workers REST API with D1 / Drizzle schema.
- **v2.0 (In Progress)**: 
  - Real-time online play via Cloudflare Durable Objects & WebSockets (Hibernation API).
  - Random matchmaking queue.
  - Friend-to-friend private challenge rooms with shareable invite links/codes.
  - Single-elimination tournament engine.
  - Realtime protocol contract package (`@et-chess/realtime-protocol`).
  - Authentication & player profiles with Better Auth.

---

## 📜 License

Private repository — all rights reserved.
