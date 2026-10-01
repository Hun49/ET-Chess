import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import {
  createRoom,
  determineColors,
  getRoomById,
  joinRoom,
  markRoomActive,
} from '../data/rooms-store';
import { createGameTicket } from '../lib/game-tickets';
import { requireAuth } from '../middleware/auth';
import type { AppEnv } from '../types';
import { createRoomSchema, joinRoomSchema } from '../validation/room.schema';

export const roomsRoute = new Hono<AppEnv>()
  // Create a new friend challenge room
  .post(
    '/',
    requireAuth,
    zValidator('json', createRoomSchema, (result, c) => {
      if (!result.success) {
        return c.json(
          {
            error: 'Validation failed',
            issues: result.error.issues,
          },
          400,
        );
      }
    }),
    async (c) => {
      const user = c.get('user');
      if (!user) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const input = c.req.valid('json');
      const room = await createRoom(user.id, input, c.env?.DB);
      return c.json({ room }, 201);
    },
  )

  // Join an existing room via 6-character code
  .post(
    '/:code/join',
    requireAuth,
    zValidator('param', joinRoomSchema, (result, c) => {
      if (!result.success) {
        return c.json(
          {
            error: 'Validation failed',
            issues: result.error.issues,
          },
          400,
        );
      }
    }),
    async (c) => {
      const user = c.get('user');
      if (!user) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const { code } = c.req.valid('param');
      try {
        const room = await joinRoom(code, user.id, c.env?.DB);
        return c.json({ room }, 200);
      } catch (err: any) {
        return c.json({ error: err?.message || 'Failed to join room' }, 400);
      }
    },
  )

  // Start the game in a room (provisions GameRoomDO)
  .post('/:roomId/start', requireAuth, async (c) => {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const roomId = c.req.param('roomId');
    const existing = await getRoomById(roomId, c.env?.DB);
    if (!existing) {
      return c.json({ error: 'Room not found' }, 404);
    }
    if (existing.hostUserId !== user.id) {
      return c.json({ error: 'Forbidden: Only the host can start the room' }, 403);
    }

    try {
      const room = await markRoomActive(roomId, user.id, c.env?.DB);

      // Provision GameRoomDO if binding is present
      if (c.env?.GAME_ROOM && room.guestUserId) {
        const doId = c.env.GAME_ROOM.idFromName(room.id);
        const stub = c.env.GAME_ROOM.get(doId);

        const { whiteUserId, blackUserId } = determineColors(
          room.hostUserId,
          room.guestUserId,
          room.hostColor,
        );

        await stub.fetch(
          new Request('https://do/init', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              gameId: room.id,
              whiteUserId,
              blackUserId,
              whiteDisplayName: whiteUserId === room.hostUserId ? 'Host' : 'Guest',
              blackDisplayName: blackUserId === room.hostUserId ? 'Host' : 'Guest',
              whiteTimeRemainingMs: room.timeControlMinutes * 60 * 1000,
              blackTimeRemainingMs: room.timeControlMinutes * 60 * 1000,
            }),
          }),
        );
      }

      return c.json({ success: true, room }, 200);
    } catch (err: any) {
      return c.json({ error: err?.message || 'Failed to start room' }, 400);
    }
  })

  // Issue a short-lived, single-use ticket for WebSocket authentication
  .post('/:roomId/ticket', requireAuth, async (c) => {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const roomId = c.req.param('roomId');
    let isParticipant = false;
    let displayName = user.name || 'Player';

    // 1. Check friend room in D1
    const room = await getRoomById(roomId, c.env?.DB);
    if (room) {
      isParticipant = room.hostUserId === user.id || room.guestUserId === user.id;
      displayName = user.name || (user.id === room.hostUserId ? 'Host' : 'Guest');
    } else if (c.env?.GAME_ROOM) {
      // 2. Fallback to GameRoomDO state for matchmaking and tournament games
      try {
        const doId = c.env.GAME_ROOM.idFromName(roomId);
        const stub = c.env.GAME_ROOM.get(doId);
        const res = await stub.fetch(new Request('http://game/state', { method: 'GET' }));
        if (res.ok) {
          const gameData = (await res.json()) as any;
          if (gameData && (gameData.whiteUserId === user.id || gameData.blackUserId === user.id)) {
            isParticipant = true;
            displayName =
              user.id === gameData.whiteUserId
                ? gameData.whiteDisplayName
                : gameData.blackDisplayName;
          }
        }
      } catch (err) {
        console.warn('Could not inspect GameRoomDO for ticket issue:', err);
      }
    }

    if (!room && !isParticipant) {
      return c.json({ error: 'Room not found' }, 404);
    }

    if (!isParticipant) {
      return c.json({ error: 'Forbidden: You are not a participant in this room' }, 403);
    }

    const secret =
      c.env?.BETTER_AUTH_SECRET || 'dev-secret-key-must-be-at-least-32-characters-long';
    const ticket = await createGameTicket(
      {
        gameId: roomId,
        userId: user.id,
        displayName,
      },
      secret,
      60_000,
    );

    return c.json({ ticket, expiresIn: 60 }, 200);
  })

  // Get room details (authorized participants or admin only)
  .get('/:roomId', requireAuth, async (c) => {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const roomId = c.req.param('roomId');
    const room = await getRoomById(roomId, c.env?.DB);
    if (!room) {
      return c.json({ error: 'Room not found' }, 404);
    }

    const isParticipant = room.hostUserId === user.id || room.guestUserId === user.id;
    const isAdmin = (user as any).role === 'admin';
    if (!isParticipant && !isAdmin) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    return c.json({ room }, 200);
  })

  // WebSocket upgrade directly proxying to GameRoomDO
  .get('/:roomId/websocket', async (c) => {
    const roomId = c.req.param('roomId');
    if (!c.env?.GAME_ROOM) {
      return c.json({ error: 'GameRoom Durable Object binding unavailable' }, 503);
    }

    const doId = c.env.GAME_ROOM.idFromName(roomId);
    const stub = c.env.GAME_ROOM.get(doId);
    return stub.fetch(c.req.raw);
  });
