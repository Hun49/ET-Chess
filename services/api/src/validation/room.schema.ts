import { z } from 'zod';

export const createRoomSchema = z.object({
  timeControlMinutes: z.number().int().min(1).max(60).default(10),
  timeControlIncrement: z.number().int().min(0).max(60).default(0),
  hostColor: z.enum(['white', 'black', 'random']).default('random'),
  kind: z.enum(['friend', 'tournament']).default('friend'),
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>;

export const joinRoomSchema = z.object({
  code: z.string().trim().length(6, 'Room code must be exactly 6 characters').toUpperCase(),
});

export type JoinRoomInput = z.infer<typeof joinRoomSchema>;
