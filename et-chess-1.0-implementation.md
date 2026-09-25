# ET Chess — v1.0 Implementation Plan (Detailed Technical Spec)

> **Before doing anything in this plan, read `ruleset.md` first.** It is the standing rulebook for how work must be done — task/subtask/microtask breakdown, the dispatch-implement-test-verify loop, code quality and UI standards, and the documentation-first policy. Re-read it before starting every task, not just once. Nothing in this plan overrides it.
>
> **Documentation-first applies to every row in the tech stack table below, no exceptions.** Before writing any code that touches a given technology, read its current official docs first (Ruleset §2). Do not implement from memory or assumption for any of these. Anywhere this document says "verify against docs," that is not optional filler — it means the exact API shape is version-sensitive and must be confirmed against the installed version's documentation before code is written against it, not guessed from training data.
>
> **This document is intentionally prescriptive.** Where it gives an exact type, function signature, file path, or config value, build exactly that — do not substitute a "cleaner" alternative name or shape without flagging it first. Where it says "verify against docs," that is the one place you're expected to go look something up rather than take the doc's word as final.

**Scope:** Local-only, single-player vs. one Stockfish bot. No networking, no auth flows in active use yet. Web + Mobile clients share game logic. Admin dashboard scaffolded but minimal (reports + user list only).

---

## 0. Tech Stack (Locked — Do Not Substitute)

| Concern | Choice |
|---|---|
| Language | TypeScript everywhere, `strict: true` in every `tsconfig.json` |
| Mobile framework | React Native + Expo (use the current Expo SDK's default RN version — verify against Expo docs, do not assume a specific RN version) |
| Mobile routing | Expo Router (file-based) |
| Web/Admin framework | React |
| Web routing | TanStack Router |
| Data fetching/caching (web + mobile) | TanStack Query |
| Client state (web + mobile) | Zustand, with `persist` middleware + AsyncStorage on mobile |
| Styling — web/admin | Tailwind CSS |
| Styling — mobile | NativeWind |
| Chess rules engine | chess.js (wrapped in `packages/chess-core` — nothing else imports chess.js directly) |
| Board UI — web | react-chessboard |
| Board UI — mobile | react-native-chessboard (Skia + Reanimated based) |
| Gestures/animation (mobile) | react-native-gesture-handler, react-native-reanimated, @shopify/react-native-skia, react-native-worklets (peer deps of react-native-chessboard — verify exact required versions against its README before installing) |
| Bot engine | Stockfish (`stockfish.wasm` on web, `stockfish` npm package on RN), driven via the UCI text protocol |
| Backend framework | Hono |
| Type-safe API client | Hono RPC (`hc` client) |
| Validation | Zod |
| Auth | Better Auth |
| Database | Cloudflare D1 (SQL) |
| ORM | Drizzle ORM |
| Cloudflare CLI/tooling | Wrangler |
| Hosting | Cloudflare (Pages for web/admin, Workers for API) |
| Icons | lucide-react (web/admin), lucide-react-native (mobile) |
| Monorepo tooling | Turborepo + pnpm workspaces |
| Linting/formatting | Biome |
| Git hooks | Husky + lint-staged |
| Testing — web/API/shared packages | Vitest |
| Testing — mobile | Jest + React Native Testing Library |
| Testing — web e2e | Playwright |
| CI | GitHub Actions |

**Anti-hallucination note on versions:** Do not hardcode a package version into any `package.json` from memory. Resolve the current stable version of each package at scaffold time (`pnpm add <pkg>` without a pinned version pulls latest; check its docs/changelog for any relevant breaking changes first, especially for chess.js — its v0.x → v1.x transition renamed several API methods and state properties — and for react-native-chessboard, which has a documented v1 → v2 breaking migration).

---

## 1. Core Architecture

**Style:** Pragmatic, feature-based. No layered "clean architecture" ceremony.

- Group code by **feature** (`game`, `bot`, `board-ui`), not by technical layer.
- Shared, reusable logic lives in `packages/*`. App-specific code (screens, navigation, platform glue) lives in each app's own workspace.
- Rule of thumb: if two workspaces would duplicate a piece of logic, it belongs in a shared package.

**Monorepo tooling:** Turborepo for task orchestration/caching, pnpm workspaces for package management (fallback to npm only if pnpm is unavailable), shared `tsconfig.base.json`, Biome enforced via Husky + lint-staged pre-commit and re-checked in CI.

**Infrastructure:** `apps/web` and `apps/admin` → Cloudflare Pages. `services/api` → Cloudflare Workers (Hono runs natively on Workers, no adapter needed). `services/api` uses Drizzle ORM against Cloudflare D1, managed via Wrangler for migrations and local dev.

---

## 2. Full Repository Structure

```
et-chess/
├── apps/
│   ├── mobile/
│   │   ├── app/                        # Expo Router file-based routes
│   │   │   ├── _layout.tsx             # Root layout (wraps app in GestureHandlerRootView)
│   │   │   ├── index.tsx               # Home screen
│   │   │   ├── game.tsx                # Active game screen
│   │   │   └── settings.tsx            # Difficulty / preferences screen
│   │   ├── src/
│   │   │   ├── features/
│   │   │   │   ├── game/               # Game screen logic, board wiring, move handling
│   │   │   │   ├── bot/                # Bot-vs-player orchestration (turn management)
│   │   │   │   └── settings/           # Difficulty selection UI + persisted preference
│   │   │   ├── store/
│   │   │   │   └── gameStore.ts        # Zustand store (see §6)
│   │   │   └── components/             # Mobile-only presentational components
│   │   ├── app.json                    # Expo config
│   │   ├── eas.json                    # EAS build profiles (preview → APK)
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── web/
│   │   ├── src/
│   │   │   ├── routes/                 # TanStack Router route tree
│   │   │   │   ├── __root.tsx
│   │   │   │   ├── index.tsx
│   │   │   │   └── game.tsx
│   │   │   ├── features/
│   │   │   │   ├── game/
│   │   │   │   └── bot/
│   │   │   ├── store/
│   │   │   │   └── gameStore.ts
│   │   │   └── components/
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── admin/
│       ├── src/
│       │   ├── routes/
│       │   │   ├── __root.tsx
│       │   │   ├── index.tsx
│       │   │   ├── reports.tsx
│       │   │   └── users.tsx
│       │   ├── features/
│       │   │   ├── reports/
│       │   │   └── users/
│       │   └── components/
│       ├── vite.config.ts
│       ├── tailwind.config.ts
│       ├── package.json
│       └── tsconfig.json
│
├── services/
│   └── api/
│       ├── src/
│       │   ├── index.ts                # Hono app entry, exported route types for RPC
│       │   ├── routes/
│       │   │   ├── health.ts
│       │   │   ├── reports.ts
│       │   │   └── users.ts
│       │   ├── db/
│       │   │   ├── schema.ts           # Drizzle schema (see §7)
│       │   │   └── client.ts           # D1 + Drizzle client setup
│       │   └── validation/
│       │       ├── report.schema.ts    # Zod schemas
│       │       └── user.schema.ts
│       ├── drizzle.config.ts
│       ├── wrangler.toml
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   ├── chess-core/
│   │   ├── src/
│   │   │   ├── index.ts                # Public API (see §4)
│   │   │   └── chess-core.test.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── bot-engine/
│   │   ├── src/
│   │   │   ├── index.ts                # Public API (see §5)
│   │   │   ├── uci.ts                  # UCI protocol parsing/formatting
│   │   │   ├── web-worker.ts           # Web Worker wrapper (stockfish.wasm)
│   │   │   ├── native-worker.ts        # RN wrapper (stockfish npm package)
│   │   │   └── bot-engine.test.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── ui-kit/                         # Optional in 1.0 — skip if it slows things down
│   │   └── src/
│   │
│   ├── types/
│   │   ├── src/
│   │   │   ├── game.ts                 # GameState, Move, PlayerColor, GameResult
│   │   │   ├── bot.ts                  # BotDifficulty
│   │   │   └── api.ts                  # User, Report (inferred from Zod schemas in services/api)
│   │   └── package.json
│   │
│   └── config/
│       ├── biome.json
│       ├── tsconfig.base.json
│       └── tailwind.preset.ts
│
├── .github/
│   └── workflows/
│       └── ci.yml                      # See §9
├── .husky/
│   └── pre-commit                      # Runs lint-staged
├── turbo.json
├── pnpm-workspace.yaml
├── biome.json                          # Root config, extends packages/config/biome.json
└── package.json
```

---

## 3. Shared Type Definitions (`packages/types`)

Exact starting shapes — extend as needed, but don't rename fields without updating every consumer:

```typescript
// packages/types/src/game.ts
export type PlayerColor = 'white' | 'black';

export type GameStatus =
  | 'ongoing'
  | 'check'
  | 'checkmate'
  | 'stalemate'
  | 'draw';

export interface Move {
  from: string;   // e.g. "e2" — algebraic square notation
  to: string;     // e.g. "e4"
  promotion?: 'q' | 'r' | 'b' | 'n';
}

export interface GameState {
  fen: string;               // current position, FEN notation
  turn: PlayerColor;
  status: GameStatus;
  moveHistory: Move[];
}

// packages/types/src/bot.ts
export type BotDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'full-strength';
```

**Anti-hallucination note:** chess.js's own internal method/property names (`isCheckmate()` vs `in_checkmate()`, etc.) are NOT necessarily identical to the field names above — `packages/chess-core` is responsible for translating chess.js's actual API (verified against its installed version's docs) into this stable shape. Nothing outside `chess-core` should assume chess.js's raw API surface.

---

## 4. `packages/chess-core` — Public API Contract

This is the single source of truth for rules. Exact functions to expose:

```typescript
// packages/chess-core/src/index.ts
export function createGame(): GameState;
export function applyMove(state: GameState, move: Move): GameState; // throws on illegal move
export function getLegalMoves(state: GameState, square: string): string[]; // legal destination squares from `square`
export function getGameStatus(state: GameState): GameStatus;
export function isGameOver(state: GameState): boolean;
```

Implementation detail: internally holds a chess.js instance (loaded from `state.fen` on each call, or held statefully — decide based on chess.js's documented performance characteristics, verify against docs rather than assuming). Translate chess.js's real return values/property names (confirm exact names for the installed version) into the `GameState`/`GameStatus` shape above.

**Required test cases for `chess-core.test.ts` (Vitest) — do not consider this package done without covering at minimum:**
- New game starts with the correct starting FEN and `turn: 'white'`.
- A legal opening move (e.g. e2-e4) updates the FEN and flips `turn`.
- An illegal move (e.g. moving through a blocking piece) throws/rejects and does not mutate state.
- Scholar's mate or Fool's mate sequence ends with `status: 'checkmate'`.
- A known stalemate position resolves to `status: 'stalemate'`.
- A known draw position (insufficient material or repetition) resolves to `status: 'draw'`.
- `getLegalMoves` for a pinned piece returns only moves that don't expose the king to check.
- Castling and en passant both work correctly when legal, and are excluded from `getLegalMoves` when not.

---

## 5. `packages/bot-engine` — Public API Contract

```typescript
// packages/bot-engine/src/index.ts
export interface BotHandle {
  getBestMove(fen: string): Promise<Move>;
  stop(): void;
  dispose(): void;
}
export function createBot(difficulty: BotDifficulty): BotHandle;
```

**Difficulty → Stockfish UCI option mapping (starting point — confirm option names/ranges against the installed Stockfish build's UCI docs, they are generally stable but must be verified, not assumed):**

| Difficulty | Skill Level (0–20) | Search limit |
|---|---|---|
| beginner | 1–2 | `go depth 5` |
| intermediate | 8–10 | `go depth 10` |
| advanced | 15 | `go movetime 1000` |
| full-strength | 20 | `go movetime 3000` |

UCI interaction sequence (standard protocol, verify exact command syntax against Stockfish's UCI docs before implementing `uci.ts`):
1. Send `uci`, wait for `uciok`.
2. Send `setoption name Skill Level value <n>`.
3. Send `isready`, wait for `readyok`.
4. Send `position fen <fen>`.
5. Send `go depth <n>` or `go movetime <ms>`.
6. Parse the `bestmove <uci-move>` line from engine output; convert UCI move notation (e.g. `e2e4`, `e7e8q` for promotion) into the `Move` shape from `packages/types`.

`web-worker.ts` and `native-worker.ts` both implement the same internal interface so `index.ts` can pick the right one per platform without callers caring which.

**Required test cases for `bot-engine.test.ts`:** mock the underlying engine process/worker (do not spin up real Stockfish in unit tests) and verify: correct UCI commands are sent for each difficulty tier, `bestmove` output is correctly parsed into a `Move` (including a promotion case), and `stop()`/`dispose()` actually halt an in-flight search without throwing.

---

## 6. Client State — Zustand Store Shape

Same shape on web and mobile (mobile adds `persist` + AsyncStorage):

```typescript
interface GameStoreState {
  game: GameState;
  botDifficulty: BotDifficulty;
  isBotThinking: boolean;
  makeMove: (move: Move) => void;         // validates via chess-core, updates `game`
  requestBotMove: () => Promise<void>;    // calls bot-engine, then makeMove with the result
  resetGame: () => void;
  setBotDifficulty: (difficulty: BotDifficulty) => void;
}
```

Mobile-only addition: wrap the store creator in Zustand's `persist` middleware with an AsyncStorage adapter, keyed e.g. `et-chess-game-state`, so `game` survives an app restart. Verify the exact `persist`/AsyncStorage adapter import path against current Zustand docs — this has changed across major versions.

---

## 7. Database Schema (Drizzle + D1) — 1.0 Scope Only

```typescript
// services/api/src/db/schema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  displayName: text('display_name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const reports = sqliteTable('reports', {
  id: text('id').primaryKey(),
  reporterId: text('reporter_id').notNull(),
  reason: text('reason').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
```

Verify Drizzle's exact `sqlite-core` import paths and column helper names against current Drizzle docs before writing this file for real — the ORM's API surface for D1 specifically (vs. other SQLite drivers) has its own setup steps that must be confirmed, not assumed. Migrations are generated and applied via Wrangler + Drizzle Kit — read both tools' current docs for the exact commands (`drizzle-kit generate`, `wrangler d1 migrations apply`, etc. — confirm exact flags).

---

## 8. API Routes — 1.0 Scope Only

Exposed via Hono, consumed via Hono RPC (`hc<AppType>`) from web/admin — never hand-written `fetch` calls to these routes.

| Method | Path | Request | Response | Zod schema file |
|---|---|---|---|---|
| GET | `/health` | — | `{ status: 'ok' }` | — |
| GET | `/reports` | — | `Report[]` | `report.schema.ts` |
| POST | `/reports` | `{ reporterId: string, reason: string }` | `Report` | `report.schema.ts` |
| GET | `/users` | — | `User[]` | `user.schema.ts` |

Every route handler validates its input against the matching Zod schema before touching the database — reject with a 400 on validation failure, don't let invalid data reach Drizzle. Export the Hono app's type (`export type AppType = typeof app`) from `services/api/src/index.ts` so `hc<AppType>` in web/admin gets full type inference — verify the exact Hono RPC export/import pattern against current Hono docs, this is central to the type-safety goal and easy to get subtly wrong.

---

## 9. CI (`​.github/workflows/ci.yml`) — Required Checks

At minimum, on every push and PR:
1. Install dependencies (pnpm, with caching).
2. Run Biome (`biome check .`) — fail the build on any lint/format violation.
3. Run `tsc --noEmit` across all workspaces (via Turborepo) — fail on any type error.
4. Run Vitest for `packages/*` and `services/api` and `apps/web`/`apps/admin`.
5. Run Jest for `apps/mobile`.
6. (Once e2e tests exist) run Playwright against a built `apps/web`.

This is what makes "verified" in the Ruleset's execution loop an actual, checkable fact rather than a self-report — a microtask is not done if CI would fail on it.

---

## 10. Build Order (Recommended Sequence)

1. **Scaffold the monorepo** — Turborepo + pnpm workspaces, the full folder structure in §2, root Biome config, Husky + lint-staged, the CI skeleton from §9 (it can fail loudly at first — that's fine, it should still exist from commit one).
2. **Build `packages/types` and `packages/chess-core`** per §3–4, with the full required test list passing in Vitest, before any UI exists.
3. **Build the web board UI (`apps/web`)** — `react-chessboard` + `chess-core`, two-human local play (pass-and-play), no bot yet. Wire the Zustand store from §6.
4. **Build the mobile board UI (`apps/mobile`)** — `react-native-chessboard` + `chess-core`/`types`; confirm Expo SDK/RN-New-Architecture/React 19 compatibility against react-native-chessboard's current docs before scaffolding; export an installable APK and test on-device.
5. **Integrate Stockfish (`packages/bot-engine`)** per §5 — web first (Web Worker + devtools makes debugging UCI traffic easier), then port to mobile.
6. **Wire difficulty tiers** into the settings screen/store.
7. **Add local game persistence (mobile)** via Zustand `persist` + AsyncStorage.
8. **Polish pass** — move history, resign/draw offer, game-over screen, lucide icons.
9. **Scaffold `services/api` + `apps/admin`** per §7–8 — health check, reports/users endpoints (Hono + Zod + Drizzle/D1), and the corresponding admin pages consuming them via Hono RPC.
10. **Deploy `web`, `admin`, and `api` to Cloudflare** (Pages + Workers, via Wrangler).
11. **Publish the repo as public on GitHub.**

---

## 11. Explicitly Out of Scope for 1.0

- Online/networked play (targeted for v2.0)
- Real user accounts / login required to play
- Puzzles, lessons, opening trainers
- Deep analytics or interaction tracking in admin
- Multiple bots/personalities (single Stockfish bot with difficulty tiers only)

---

## 12. Anti-Hallucination Checklist (Read Before Every Microtask)

- [ ] Have I read the current docs for every library this microtask touches, not just recalled them from training?
- [ ] Am I inventing a function/method/prop name because it "sounds right," or have I confirmed it exists in the installed version?
- [ ] Does this microtask's output match an exact contract given in this document (§3–8), or have I silently changed a shape/name?
- [ ] If I hit an ambiguity this document doesn't resolve, did I flag it instead of guessing?
- [ ] Have I written the test(s) for this microtask, and did they actually run and pass — not just "should pass"?
