import type { AnyD1Database } from 'drizzle-orm/d1';
import type { AuthUser, Session } from './db/schema';

export interface DurableObjectIdLike {
  toString(): string;
  name?: string;
}

export interface DurableObjectStubLike {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

export interface AnyDurableObjectNamespace {
  idFromName(name: string): DurableObjectIdLike;
  get(id: DurableObjectIdLike, options?: unknown): DurableObjectStubLike;
}

export interface Bindings {
  DB?: AnyD1Database;
  GAME_ROOM?: AnyDurableObjectNamespace;
  MATCHMAKER?: AnyDurableObjectNamespace;
  TOURNAMENT?: AnyDurableObjectNamespace;
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  ALLOWED_ORIGINS?: string;
  GAME_TICKET_SECRET?: string;
}

export type AppVariables = {
  user?: AuthUser | null;
  session?: Session | null;
};

export type AppEnv = {
  Bindings: Bindings;
  Variables: AppVariables;
};
