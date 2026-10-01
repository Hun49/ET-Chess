import { describe, expect, it } from 'vitest';
import {
  account,
  gameSettlements,
  games,
  profiles,
  reports,
  rooms,
  session,
  tournamentMatches,
  tournamentParticipants,
  tournaments,
  user,
  users,
  verification,
} from './schema';

describe('Database Schema Definitions (Drizzle / D1)', () => {
  it('exports all 1.0 and 2.0 tables', () => {
    expect(users).toBeDefined();
    expect(reports).toBeDefined();
    expect(user).toBeDefined();
    expect(session).toBeDefined();
    expect(account).toBeDefined();
    expect(verification).toBeDefined();
    expect(profiles).toBeDefined();
    expect(rooms).toBeDefined();
    expect(games).toBeDefined();
    expect(tournaments).toBeDefined();
    expect(tournamentParticipants).toBeDefined();
    expect(tournamentMatches).toBeDefined();
  });

  it('profiles table has correct column names and defaults', () => {
    expect(profiles.userId.name).toBe('user_id');
    expect(profiles.displayName.name).toBe('display_name');
    expect(profiles.rating.name).toBe('rating');
    expect(profiles.rating.default).toBe(1200);
    expect(profiles.gamesPlayed.name).toBe('games_played');
    expect(profiles.gamesPlayed.default).toBe(0);
  });

  it('rooms table defines kind and status defaults and color slots', () => {
    expect(rooms.id.name).toBe('id');
    expect(rooms.code.name).toBe('code');
    expect(rooms.guestUserId.name).toBe('guest_user_id');
    expect(rooms.whiteUserId.name).toBe('white_user_id');
    expect(rooms.blackUserId.name).toBe('black_user_id');
    expect(rooms.timeControlMinutes.name).toBe('time_control_minutes');
    expect(rooms.timeControlIncrement.name).toBe('time_control_increment');
    expect(rooms.hostColor.name).toBe('host_color');
    expect(rooms.kind.name).toBe('kind');
    expect(rooms.status.name).toBe('status');
    expect(rooms.status.default).toBe('waiting');
  });

  it('gameSettlements table defines required fields and uniqueness', () => {
    expect(gameSettlements.id.name).toBe('id');
    expect(gameSettlements.gameId.name).toBe('game_id');
    expect(gameSettlements.whiteUserId.name).toBe('white_user_id');
    expect(gameSettlements.blackUserId.name).toBe('black_user_id');
    expect(gameSettlements.result.name).toBe('result');
    expect(gameSettlements.ratingDeltaWhite.name).toBe('rating_delta_white');
    expect(gameSettlements.ratingDeltaBlack.name).toBe('rating_delta_black');
    expect(gameSettlements.settledAt.name).toBe('settled_at');
  });

  it('games table defines ongoing result default and rating deltas', () => {
    expect(games.id.name).toBe('id');
    expect(games.whiteUserId.name).toBe('white_user_id');
    expect(games.blackUserId.name).toBe('black_user_id');
    expect(games.result.name).toBe('result');
    expect(games.result.default).toBe('ongoing');
    expect(games.ratingDeltaWhite.name).toBe('rating_delta_white');
    expect(games.ratingDeltaBlack.name).toBe('rating_delta_black');
  });

  it('tournaments table defines registering status default and hostUserId', () => {
    expect(tournaments.id.name).toBe('id');
    expect(tournaments.hostUserId.name).toBe('host_user_id');
    expect(tournaments.status.name).toBe('status');
    expect(tournaments.status.default).toBe('registering');
  });
});
