import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// ==========================================
// 1.0 Legacy Tables (Preserved for compatibility)
// ==========================================

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

export type UserTable = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type ReportTable = typeof reports.$inferSelect;
export type InsertReport = typeof reports.$inferInsert;

// ==========================================
// 2.0 Better Auth Tables
// ==========================================

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('emailVerified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),
  role: text('role').notNull().default('user'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
});

export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
});

export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: integer('accessTokenExpiresAt', { mode: 'timestamp' }),
  refreshTokenExpiresAt: integer('refreshTokenExpiresAt', { mode: 'timestamp' }),
  scope: text('scope'),
  password: text('password'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
});

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp' }),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }),
});

export type AuthUser = typeof user.$inferSelect;
export type InsertAuthUser = typeof user.$inferInsert;
export type Session = typeof session.$inferSelect;
export type Account = typeof account.$inferSelect;
export type Verification = typeof verification.$inferSelect;

// ==========================================
// 2.0 Profiles & Online Game Tables
// ==========================================

export const profiles = sqliteTable('profiles', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  displayName: text('display_name').notNull(),
  rating: integer('rating').notNull().default(1200),
  gamesPlayed: integer('games_played').notNull().default(0),
});

export const rooms = sqliteTable('rooms', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  hostUserId: text('host_user_id').notNull(),
  guestUserId: text('guest_user_id'),
  whiteUserId: text('white_user_id'),
  blackUserId: text('black_user_id'),
  timeControlMinutes: integer('time_control_minutes').notNull().default(10),
  timeControlIncrement: integer('time_control_increment').notNull().default(0),
  hostColor: text('host_color', { enum: ['white', 'black', 'random'] })
    .notNull()
    .default('random'),
  kind: text('kind', { enum: ['friend', 'tournament'] }).notNull(),
  status: text('status', { enum: ['waiting', 'ready', 'active', 'finished'] })
    .notNull()
    .default('waiting'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const games = sqliteTable('games', {
  id: text('id').primaryKey(),
  roomId: text('room_id'),
  tournamentMatchId: text('tournament_match_id'),
  whiteUserId: text('white_user_id').notNull(),
  blackUserId: text('black_user_id').notNull(),
  finalFen: text('final_fen'),
  pgn: text('pgn'),
  result: text('result', { enum: ['white', 'black', 'draw', 'ongoing'] })
    .notNull()
    .default('ongoing'),
  ratingDeltaWhite: integer('rating_delta_white'),
  ratingDeltaBlack: integer('rating_delta_black'),
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull(),
  endedAt: integer('ended_at', { mode: 'timestamp' }),
});

export const gameSettlements = sqliteTable('game_settlements', {
  id: text('id').primaryKey(),
  gameId: text('game_id').notNull().unique(),
  whiteUserId: text('white_user_id').notNull(),
  blackUserId: text('black_user_id').notNull(),
  result: text('result', { enum: ['white', 'black', 'draw'] }).notNull(),
  ratingDeltaWhite: integer('rating_delta_white').notNull(),
  ratingDeltaBlack: integer('rating_delta_black').notNull(),
  settledAt: integer('settled_at', { mode: 'timestamp' }).notNull(),
});

export const tournaments = sqliteTable('tournaments', {
  id: text('id').primaryKey(),
  roomId: text('room_id').notNull(),
  name: text('name').notNull(),
  hostUserId: text('host_user_id'),
  status: text('status', { enum: ['registering', 'in-progress', 'finished'] })
    .notNull()
    .default('registering'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const tournamentParticipants = sqliteTable('tournament_participants', {
  id: text('id').primaryKey(),
  tournamentId: text('tournament_id').notNull(),
  userId: text('user_id').notNull(),
  seed: integer('seed').notNull(),
});

export const tournamentMatches = sqliteTable('tournament_matches', {
  id: text('id').primaryKey(),
  tournamentId: text('tournament_id').notNull(),
  round: integer('round').notNull(),
  matchIndex: integer('match_index'),
  player1UserId: text('player1_user_id'),
  player2UserId: text('player2_user_id'),
  gameId: text('game_id'),
  winnerUserId: text('winner_user_id'),
});

export type ProfileTable = typeof profiles.$inferSelect;
export type InsertProfile = typeof profiles.$inferInsert;
export type RoomTable = typeof rooms.$inferSelect;
export type InsertRoom = typeof rooms.$inferInsert;
export type GameTable = typeof games.$inferSelect;
export type InsertGame = typeof games.$inferInsert;
export type TournamentTable = typeof tournaments.$inferSelect;
export type InsertTournament = typeof tournaments.$inferInsert;
export type TournamentParticipantTable = typeof tournamentParticipants.$inferSelect;
export type InsertTournamentParticipant = typeof tournamentParticipants.$inferInsert;
export type TournamentMatchTable = typeof tournamentMatches.$inferSelect;
export type InsertTournamentMatch = typeof tournamentMatches.$inferInsert;
export type GameSettlementTable = typeof gameSettlements.$inferSelect;
export type InsertGameSettlement = typeof gameSettlements.$inferInsert;
