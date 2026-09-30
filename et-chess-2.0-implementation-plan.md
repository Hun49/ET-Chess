# ET Chess — v2.0 Implementation Plan (Online Play: Matchmaking, Friend Rooms & Tournaments)

> **Before doing anything in this plan, read `ruleset.md` first.** Re-read it before every task. The dispatch-implement-test-verify loop, task/subtask/microtask breakdown, and documentation-first policy all apply here exactly as in 1.0 — this document does not relax any of them.
>
> **Documentation-first applies to every row in the tech stack table below, no exceptions** — especially the new additions in this phase (Durable Objects, WebSocket Hibernation API, Better Auth's actual session/schema model). Where this doc says "verify against docs," that API shape is genuinely version-sensitive and must be confirmed against current docs before code is written, not recalled from training.
>
> **Prerequisite:** This plan assumes ET Chess 1.0 is functionally complete — `packages/chess-core`, `packages/bot-engine`, `packages/types`, and local play on web + mobile already exist and work. This phase builds on top of that, it does not redo it.
>
> **Scope of this document:** Everything you asked to build together in this phase — friend-to-friend challenge rooms, random matchmaking, and tournaments — as one connected online-play system, built on a single shared real-time foundation (see §2). They are not three separate features bolted on; a tournament match and a random matchmaking match both ultimately run through the same "room + live game" machinery a friend challenge uses.

---

## 0. New Tech Stack Additions for 2.0

Everything from the 1.0 stack still applies. New for this phase:

| Concern | Choice |
|---|---|
| Real-time transport | Cloudflare Durable Objects + WebSockets, using the **WebSocket Hibernation API** (verify current usage pattern against Cloudflare Workers docs — this is the recommended approach for cost/scale, distinct from the older non-hibernatable WebSocket pattern) |
| Auth (now actually enforced) | Better Auth, account required to play online. Verify Better Auth's actual generated schema (user/session/account/verification tables) against current docs before writing `profiles` as an extension table — do not assume its table names or columns from memory |
| Server-authoritative game state | Each live game's canonical `GameState` (from `packages/chess-core`) lives inside its Durable Object instance, not the client |
| Shared WS message contract | New package `packages/realtime-protocol` — Zod schemas + inferred TypeScript types for every WebSocket message, imported by the Durable Objects AND both clients, so client and server can never silently drift out of sync on message shape |
| Tournament format | Single-elimination bracket (simplest correct format — round-robin/Swiss explicitly deferred, see §9) |
| Matchmaking model | FIFO pairing within a rating band (simple, not full Glicko/Elo-matched — see §6) |

---

## 1. New/Changed Repository Structure

```
et-chess/
├── apps/
│   ├── mobile/
│   │   └── src/features/
│   │       ├── online/
│   │       │   ├── lobby/           # "Play online" hub: quick match / create room / join room / tournaments
│   │       │   ├── room/            # Friend-challenge room screen (waiting for opponent, room code display)
│   │       │   ├── matchmaking/     # Queue screen ("Finding an opponent...")
│   │       │   └── tournament/      # Bracket view, current-match screen
│   │       └── ws/
│   │           └── useGameSocket.ts # WebSocket client hook, shared shape with web
│   ├── web/
│   │   └── src/features/
│   │       └── online/              # Same four sub-features as mobile
│   └── admin/
│       └── src/features/
│           ├── rooms/               # Admin visibility into active rooms/games (basic list — 2.0 stays minimal here too)
│           └── tournaments/         # Admin visibility into tournaments
│
├── services/
│   └── api/
│       ├── src/
│       │   ├── durable-objects/
│       │   │   ├── GameRoomDO.ts        # One instance per live game — see §3
│       │   │   ├── MatchmakerDO.ts      # Singleton queue coordinator — see §6
│       │   │   └── TournamentDO.ts      # One instance per tournament — see §7
│       │   ├── routes/
│       │   │   ├── auth.ts              # Better Auth handler mount
│       │   │   ├── rooms.ts             # Create/join room (friend challenge) endpoints
│       │   │   ├── matchmaking.ts       # Enter/leave matchmaking queue endpoints
│       │   │   └── tournaments.ts       # Create/join/start tournament endpoints
│       │   ├── db/
│       │   │   └── schema.ts            # Extended — see §4
│       │   └── validation/
│       │       ├── room.schema.ts
│       │       ├── matchmaking.schema.ts
│       │       └── tournament.schema.ts
│       └── wrangler.toml                # Add Durable Object bindings + migrations block — see §8
│
├── packages/
│   └── realtime-protocol/
│       ├── src/
│       │   ├── index.ts                 # Exports every WS message schema + type — see §2
│       │   └── realtime-protocol.test.ts
│       └── package.json
```

---

## 2. Shared Real-Time Protocol (`packages/realtime-protocol`)

Every WebSocket message, in both directions, is one of these. Client and Durable Object both import this package — never hand-type a message shape inline anywhere else.

```typescript
// packages/realtime-protocol/src/index.ts
import { z } from 'zod';

// Client → Server
export const ClientMoveMessage = z.object({
  type: z.literal('move'),
  move: z.object({ from: z.string(), to: z.string(), promotion: z.enum(['q','r','b','n']).optional() }),
});
export const ClientResignMessage = z.object({ type: z.literal('resign') });
export const ClientDrawOfferMessage = z.object({ type: z.literal('draw-offer') });
export const ClientDrawResponseMessage = z.object({ type: z.literal('draw-response'), accept: z.boolean() });

export const ClientMessage = z.discriminatedUnion('type', [
  ClientMoveMessage, ClientResignMessage, ClientDrawOfferMessage, ClientDrawResponseMessage,
]);

// Server → Client
export const ServerStateSyncMessage = z.object({ type: z.literal('state-sync'), gameState: z.any() /* GameState, see note below */ });
export const ServerOpponentDisconnectedMessage = z.object({ type: z.literal('opponent-disconnected'), gracePeriodMs: z.number() });
export const ServerOpponentReconnectedMessage = z.object({ type: z.literal('opponent-reconnected') });
export const ServerGameOverMessage = z.object({ type: z.literal('game-over'), result: z.enum(['white','black','draw']), reason: z.string() });
export const ServerDrawOfferedMessage = z.object({ type: z.literal('draw-offered') });
export const ServerErrorMessage = z.object({ type: z.literal('error'), message: z.string() });

export const ServerMessage = z.discriminatedUnion('type', [
  ServerStateSyncMessage, ServerOpponentDisconnectedMessage, ServerOpponentReconnectedMessage,
  ServerGameOverMessage, ServerDrawOfferedMessage, ServerErrorMessage,
]);

export type ClientMessage = z.infer<typeof ClientMessage>;
export type ServerMessage = z.infer<typeof ServerMessage>;
```

**Note:** `gameState` in `ServerStateSyncMessage` should be typed as the actual `GameState` from `packages/types`, not `z.any()` — replace that placeholder before this is considered done; it's left loose here only because this document can't import your existing package. Every inbound WS message on the server must be parsed through `ClientMessage.parse(...)` before being acted on — never trust raw JSON from a socket.

**Required tests (`realtime-protocol.test.ts`):** every message variant round-trips through its schema correctly; malformed/extra-field messages are rejected, not silently accepted.

---

## 3. `GameRoomDO` — One Live Game, Server-Authoritative

**Responsibility:** holds the canonical `GameState` (via `packages/chess-core`) for exactly one in-progress game, for its entire lifetime, then persists the finished result to D1 and can be discarded.

**Contract (verify exact Durable Object class shape — `fetch`, `alarm`, WebSocket hibernation handlers — against current Cloudflare docs before implementing):**
- On first connection from each of the two players, register their WebSocket, validate their session via Better Auth, and confirm they're one of this game's two assigned players — reject anyone else.
- On a `move` message: validate via `chess-core.applyMove` (illegal move → send `error`, do not apply). Valid move → update internal `GameState`, broadcast `state-sync` to both sockets.
- On `resign` / a completed checkmate / stalemate / draw: broadcast `game-over`, write the final result + move history to the `games` table in D1 (via `services/api/src/db`), then the DO can go idle.
- On a socket closing unexpectedly: broadcast `opponent-disconnected` with a grace period (recommend 60s — confirm this is a reasonable value with HUN if it matters, otherwise treat 60s as the default), start an alarm. If the player reconnects (new WS attaches with a valid session matching this game) before the alarm fires, broadcast `opponent-reconnected` and cancel it. If the alarm fires first, the remaining player is offered a forfeit-win; write the result accordingly.
- Do NOT trust the client's own board state for anything except which move it's attempting — the DO's own `chess-core` instance is the only source of truth for whether a game is over.

**Required tests:** a full scripted game (both "players" as mocked sockets) reaches checkmate and persists correctly; an illegal move is rejected without mutating state; a disconnect-then-reconnect within the grace period does not end the game; a disconnect exceeding the grace period does end it as a forfeit.

---

## 4. Database Schema Additions (Drizzle + D1)

Better Auth will generate/expect its own core tables (user, session, account, verification — **verify their exact names/columns against current Better Auth docs, do not assume**). Extend rather than duplicate:

```typescript
// services/api/src/db/schema.ts (additions)
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const profiles = sqliteTable('profiles', {
  userId: text('user_id').primaryKey(), // FK to Better Auth's user table — verify its actual id column/type
  displayName: text('display_name').notNull(),
  rating: integer('rating').notNull().default(1200),
  gamesPlayed: integer('games_played').notNull().default(0),
});

export const rooms = sqliteTable('rooms', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),          // short shareable code, e.g. 6 chars
  hostUserId: text('host_user_id').notNull(),
  kind: text('kind', { enum: ['friend', 'tournament'] }).notNull(),
  status: text('status', { enum: ['waiting', 'active', 'finished'] }).notNull().default('waiting'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const games = sqliteTable('games', {
  id: text('id').primaryKey(),
  roomId: text('room_id'),                        // null for matchmaking games with no room
  whiteUserId: text('white_user_id').notNull(),
  blackUserId: text('black_user_id').notNull(),
  finalFen: text('final_fen'),
  pgn: text('pgn'),                                // full move history, verify chess.js's exact PGN export method against docs
  result: text('result', { enum: ['white', 'black', 'draw', 'ongoing'] }).notNull().default('ongoing'),
  ratingDeltaWhite: integer('rating_delta_white'),
  ratingDeltaBlack: integer('rating_delta_black'),
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull(),
  endedAt: integer('ended_at', { mode: 'timestamp' }),
});

export const tournaments = sqliteTable('tournaments', {
  id: text('id').primaryKey(),
  roomId: text('room_id').notNull(),
  name: text('name').notNull(),
  status: text('status', { enum: ['registering', 'in-progress', 'finished'] }).notNull().default('registering'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const tournamentParticipants = sqliteTable('tournament_participants', {
  tournamentId: text('tournament_id').notNull(),
  userId: text('user_id').notNull(),
  seed: integer('seed').notNull(),
});

export const tournamentMatches = sqliteTable('tournament_matches', {
  id: text('id').primaryKey(),
  tournamentId: text('tournament_id').notNull(),
  round: integer('round').notNull(),
  player1UserId: text('player1_user_id'),
  player2UserId: text('player2_user_id'),          // null = "bye" if odd bracket
  gameId: text('game_id'),                         // set once the match's game starts
  winnerUserId: text('winner_user_id'),
});
```

Migrations for these + Better Auth's own tables go through Drizzle Kit + Wrangler exactly as in 1.0 — verify exact commands against current docs, don't assume they're unchanged from whatever version was used in 1.0.

---

## 5. Friend Challenge Rooms

**Flow:** Host calls `POST /rooms` (`kind: 'friend'`) → gets back `{ roomId, code }` → shares the code/link (e.g. pasted into Discord) → friend calls `POST /rooms/:code/join` → once 2 users are in the room, host calls `POST /rooms/:roomId/start` → server creates a `games` row, spins up (or routes to) a `GameRoomDO` for that game id, both clients open a WebSocket to it.

**API routes (`services/api/src/routes/rooms.ts`), validated via the matching Zod schemas:**

| Method | Path | Purpose |
|---|---|---|
| POST | `/rooms` | Create a friend room, returns room + shareable code |
| POST | `/rooms/:code/join` | Join an existing room by code |
| POST | `/rooms/:roomId/start` | Host starts the game once 2 players are present |
| GET | `/rooms/:roomId` | Room status (for the waiting-room screen to poll or for initial load before WS connects) |

All require an authenticated session (Better Auth) — verify the exact middleware/session-check pattern against current Better Auth docs for Hono specifically.

---

## 6. Random Matchmaking (`MatchmakerDO`)

Kept intentionally simple for 2.0 — this is not meant to be a full rating-matched system yet:

- Singleton Durable Object (one fixed instance ID) holds an in-memory queue: `{ userId, rating, queuedAt }[]`.
- `POST /matchmaking/join` → adds the caller to the queue (via a message to the DO), opens a WebSocket for queue status updates.
- The DO periodically (or on every join) scans the queue: if two entries exist within a rating band (start simple — ±200 rating points; widen the band the longer someone's waited, e.g. +50 per 15 seconds queued, to guarantee eventual matching), pair them: remove both from the queue, create a `games` row, and message both clients to connect to the new game's `GameRoomDO`.
- `POST /matchmaking/leave` → removes the caller from the queue.
- **Rating update on game end:** apply a simple Elo-style update (verify the standard Elo formula — this is well-established and safe to implement directly: `newRating = oldRating + K * (actualScore - expectedScore)`, with `expectedScore = 1 / (1 + 10^((opponentRating - rating)/400))`, `K = 32` as a reasonable default for a hobby app) and store the delta on the `games` row, update both `profiles.rating`.

**Required tests:** two queued users within the rating band get paired; users outside the band don't get paired until the band widens; rating updates after a decisive game move both ratings in the correct direction by a value matching the Elo formula.

---

## 7. Tournaments (`TournamentDO`)

Single-elimination only for 2.0 (explicitly — no Swiss/round-robin yet, see §9).

**Flow:**
1. Host creates a room (`kind: 'tournament'`) and a `tournaments` row (`status: 'registering'`), shares the code.
2. Other users join via the room code, added to `tournament_participants`.
3. Host calls a "start tournament" endpoint once ready → server randomly seeds participants, generates round 1 pairings (if odd count, one random participant gets a bye), writes `tournament_matches` rows, sets `status: 'in-progress'`.
4. For each pairing, a `games` row + `GameRoomDO` is created exactly as in §5/§6 — a tournament match IS a normal 1v1 game under the hood, just one whose result feeds back into the bracket.
5. On each match's `game-over`, `TournamentDO` records the winner in `tournament_matches`, and once every match in the current round is finished, generates the next round's pairings from the winners. Repeat until one player remains → `status: 'finished'`.

**Required tests:** a bracket of 8 correctly produces 3 rounds and one final winner; an odd-numbered bracket (e.g. 5 players) correctly assigns exactly one bye per round as needed; a tournament doesn't advance a round until every match in it has actually finished.

---

## 8. Cloudflare Config Changes

`wrangler.toml` needs Durable Object bindings + a migrations block for `GameRoomDO`, `MatchmakerDO`, and `TournamentDO` — verify the exact current `[[durable_objects.bindings]]` / `[[migrations]]` TOML syntax against Cloudflare's docs, this has had syntax changes across Wrangler versions and must not be guessed.

---

## 9. Explicitly Out of Scope for 2.0

- Swiss-system or round-robin tournaments (single-elimination only for now)
- Spectator mode (watching a game you're not playing in)
- In-game chat (Discord is already the chat layer per your stated use case — don't duplicate it)
- Anti-cheat / engine-assist detection
- Full Glicko-2 or confidence-interval rating (the simple Elo update in §6 is intentionally the ceiling for 2.0)
- Puzzles/lessons (still deferred from 1.0)

---

## 10. Build Order (Recommended Sequence)

1. **Wire Better Auth for real** — account creation/login actually gated in front of all online features on web + mobile.
2. **`packages/realtime-protocol`** — full schema set from §2, tested, before any Durable Object or client code touches it.
3. **`GameRoomDO`** — build and test in isolation (mocked sockets) per §3, since every other feature in this doc depends on it working correctly first.
4. **Friend challenge rooms (§5)** — the simplest online flow, and the one most directly tied to your stated "play with friends in Discord" use case. Get this fully working end-to-end (web + mobile) before moving on.
5. **Random matchmaking (`MatchmakerDO`, §6)** — reuses `GameRoomDO` from step 3.
6. **Tournaments (`TournamentDO`, §7)** — reuses the same game creation path as steps 4–5.
7. **Admin visibility (`apps/admin`)** — basic rooms/tournaments list views, per the "stays minimal" note in §1.
8. **Full pass on reconnect/disconnect handling** across all three flows, since it's easy to get right for the happy path and wrong for the edge cases — this is exactly what the Ruleset's verification loop (§4) exists to catch, don't let it slide through as "should work."

---

## 11. Anti-Hallucination Checklist (Read Before Every Microtask)

- [ ] Have I confirmed this Durable Object / Better Auth / WebSocket API shape against current docs, not recalled it?
- [ ] Is every WebSocket message actually validated through `packages/realtime-protocol`'s schemas, both sending and receiving — not a hand-typed object anywhere?
- [ ] Does the server ever trust client-reported game state for anything other than "here is the move I'm attempting"?
- [ ] Have I written and actually run the required tests for this section, including the disconnect/edge-case ones — not just the happy path?
- [ ] If this microtask's exact contract isn't fully specified in this document, did I flag the gap instead of inventing a shape?
