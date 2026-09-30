import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import {
  createRoom,
  determineColors,
  getRoomById,
  joinRoom,
  markRoomActive,
} from '../data/rooms-store';
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

  // Get room details
  .get('/:roomId', async (c) => {
    const roomId = c.req.param('roomId');
    const room = await getRoomById(roomId, c.env?.DB);
    if (!room) {
      return c.json({ error: 'Room not found' }, 404);
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
