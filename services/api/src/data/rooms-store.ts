import { eq } from 'drizzle-orm';
import { type AnyD1Database, drizzle } from 'drizzle-orm/d1';
import * as schema from '../db/schema';
import type { CreateRoomInput } from '../validation/room.schema';

export interface RoomRecord {
  id: string;
  code: string;
  hostUserId: string;
  guestUserId: string | null;
  timeControlMinutes: number;
  timeControlIncrement: number;
  hostColor: 'white' | 'black' | 'random';
  kind: 'friend' | 'tournament';
  status: 'waiting' | 'ready' | 'active' | 'finished';
  createdAt: Date;
  whiteUserId?: string;
  blackUserId?: string;
}

// In-memory store for dev/testing when D1 is not bound
let inMemoryRooms: RoomRecord[] = [];

export function resetRoomsStore(): void {
  inMemoryRooms = [];
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * CODE_ALPHABET.length);
    code += CODE_ALPHABET[randomIndex];
  }
  return code;
}

export function determineColors(
  hostUserId: string,
  guestUserId: string,
  hostColor: 'white' | 'black' | 'random',
): { whiteUserId: string; blackUserId: string } {
  if (hostColor === 'white') {
    return { whiteUserId: hostUserId, blackUserId: guestUserId };
  }
  if (hostColor === 'black') {
    return { whiteUserId: guestUserId, blackUserId: hostUserId };
  }
  const hostIsWhite = Math.random() < 0.5;
  return hostIsWhite
    ? { whiteUserId: hostUserId, blackUserId: guestUserId }
    : { whiteUserId: guestUserId, blackUserId: hostUserId };
}

export async function createRoom(
  hostUserId: string,
  input: CreateRoomInput,
  d1?: AnyD1Database,
): Promise<RoomRecord> {
  const roomId = crypto.randomUUID();
  const code = generateRoomCode();

  const record: RoomRecord = {
    id: roomId,
    code,
    hostUserId,
    guestUserId: null,
    timeControlMinutes: input.timeControlMinutes,
    timeControlIncrement: input.timeControlIncrement,
    hostColor: input.hostColor,
    kind: input.kind,
    status: 'waiting',
    createdAt: new Date(),
  };

  if (d1) {
    try {
      const db = drizzle(d1, { schema });
      // Retry in rare event of code collision
      let inserted = false;
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          await db.insert(schema.rooms).values({
            id: record.id,
            code: record.code,
            hostUserId: record.hostUserId,
            guestUserId: record.guestUserId,
            timeControlMinutes: record.timeControlMinutes,
            timeControlIncrement: record.timeControlIncrement,
            hostColor: record.hostColor,
            kind: record.kind,
            status: record.status,
            createdAt: record.createdAt,
          });
          inserted = true;
          break;
        } catch (err: any) {
          if (err?.message?.includes('UNIQUE constraint failed: rooms.code')) {
            record.code = generateRoomCode();
          } else {
            throw err;
          }
        }
      }
      if (!inserted) {
        throw new Error('Failed to generate unique room code');
      }
      return record;
    } catch {
      // Fallback to in-memory if D1 table not ready
    }
  }

  inMemoryRooms.push(record);
  return record;
}

export async function getRoomById(roomId: string, d1?: AnyD1Database): Promise<RoomRecord | null> {
  if (d1) {
    try {
      const db = drizzle(d1, { schema });
      const rows = await db.select().from(schema.rooms).where(eq(schema.rooms.id, roomId)).limit(1);

      if (rows.length > 0) {
        const r = rows[0]!;
        const { whiteUserId, blackUserId } = r.guestUserId
          ? determineColors(r.hostUserId, r.guestUserId, r.hostColor)
          : { whiteUserId: undefined, blackUserId: undefined };

        return {
          id: r.id,
          code: r.code,
          hostUserId: r.hostUserId,
          guestUserId: r.guestUserId,
          timeControlMinutes: r.timeControlMinutes,
          timeControlIncrement: r.timeControlIncrement,
          hostColor: r.hostColor,
          kind: r.kind,
          status: r.status,
          createdAt: r.createdAt,
          whiteUserId,
          blackUserId,
        };
      }
      return null;
    } catch {
      // Fallback to in-memory
    }
  }

  const found = inMemoryRooms.find((r) => r.id === roomId);
  return found || null;
}

export async function getRoomByCode(code: string, d1?: AnyD1Database): Promise<RoomRecord | null> {
  const normalizedCode = code.trim().toUpperCase();

  if (d1) {
    try {
      const db = drizzle(d1, { schema });
      const rows = await db
        .select()
        .from(schema.rooms)
        .where(eq(schema.rooms.code, normalizedCode))
        .limit(1);

      if (rows.length > 0) {
        const r = rows[0]!;
        return {
          id: r.id,
          code: r.code,
          hostUserId: r.hostUserId,
          guestUserId: r.guestUserId,
          timeControlMinutes: r.timeControlMinutes,
          timeControlIncrement: r.timeControlIncrement,
          hostColor: r.hostColor,
          kind: r.kind,
          status: r.status,
          createdAt: r.createdAt,
        };
      }
      return null;
    } catch {
      // Fallback
    }
  }

  const found = inMemoryRooms.find((r) => r.code === normalizedCode);
  return found || null;
}

export async function joinRoom(
  code: string,
  guestUserId: string,
  d1?: AnyD1Database,
): Promise<RoomRecord> {
  const room = await getRoomByCode(code, d1);
  if (!room) {
    throw new Error('Room not found');
  }

  if (room.status !== 'waiting') {
    throw new Error('Room is not open for joining');
  }

  if (room.hostUserId === guestUserId) {
    throw new Error('You cannot join your own room as an opponent');
  }

  const { whiteUserId, blackUserId } = determineColors(
    room.hostUserId,
    guestUserId,
    room.hostColor,
  );

  const updated: RoomRecord = {
    ...room,
    guestUserId,
    status: 'ready',
    whiteUserId,
    blackUserId,
  };

  if (d1) {
    try {
      const db = drizzle(d1, { schema });
      await db
        .update(schema.rooms)
        .set({
          guestUserId,
          status: 'ready',
        })
        .where(eq(schema.rooms.id, room.id));
      return updated;
    } catch {
      // Fallback
    }
  }

  const index = inMemoryRooms.findIndex((r) => r.id === room.id);
  if (index !== -1) {
    inMemoryRooms[index] = updated;
  }

  return updated;
}

export async function markRoomActive(
  roomId: string,
  requesterUserId: string,
  d1?: AnyD1Database,
): Promise<RoomRecord> {
  const room = await getRoomById(roomId, d1);
  if (!room) {
    throw new Error('Room not found');
  }

  if (room.hostUserId !== requesterUserId && room.guestUserId !== requesterUserId) {
    throw new Error('Unauthorized');
  }

  if (room.status !== 'ready' && room.status !== 'active') {
    throw new Error('Room cannot be started');
  }

  const updated: RoomRecord = {
    ...room,
    status: 'active',
  };

  if (d1) {
    try {
      const db = drizzle(d1, { schema });
      await db.update(schema.rooms).set({ status: 'active' }).where(eq(schema.rooms.id, room.id));
      return updated;
    } catch {
      // Fallback
    }
  }

  const index = inMemoryRooms.findIndex((r) => r.id === room.id);
  if (index !== -1) {
    inMemoryRooms[index] = updated;
  }

  return updated;
}

export async function listRooms(d1?: AnyD1Database): Promise<RoomRecord[]> {
  if (d1) {
    try {
      const db = drizzle(d1, { schema });
      const rows = await db.select().from(schema.rooms).limit(50);
      return rows.map((r) => ({
        id: r.id,
        code: r.code,
        hostUserId: r.hostUserId,
        guestUserId: r.guestUserId,
        timeControlMinutes: r.timeControlMinutes,
        timeControlIncrement: r.timeControlIncrement,
        hostColor: r.hostColor,
        kind: r.kind,
        status: r.status,
        createdAt: r.createdAt,
      }));
    } catch {
      // Fallback to in-memory
    }
  }
  return [...inMemoryRooms].reverse();
}
