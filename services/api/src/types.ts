import type { AnyD1Database } from 'drizzle-orm/d1';
import type { AuthUser, Session } from './db/schema';

export interface AnyDurableObjectNamespace {
  idFromName(name: string): any;
  get(id: any, options?: any): any;
}

export interface Bindings {
  DB?: AnyD1Database;
  GAME_ROOM?: AnyDurableObjectNamespace;
  MATCHMAKER?: AnyDurableObjectNamespace;
  TOURNAMENT?: AnyDurableObjectNamespace;
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
}

export type AppVariables = {
  user?: AuthUser | null;
  session?: Session | null;
};

export type AppEnv = {
  Bindings: Bindings;
  Variables: AppVariables;
};
