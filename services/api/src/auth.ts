import { expo } from '@better-auth/expo';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { type DrizzleD1Database, drizzle } from 'drizzle-orm/d1';
import * as schema from './db/schema';
import type { Bindings } from './types';

export function createAuth(
  bindings?: Bindings,
  customDb?: DrizzleD1Database<typeof schema> | null,
) {
  const db = customDb ?? (bindings?.DB ? drizzle(bindings.DB, { schema }) : null);

  return betterAuth({
    database: drizzleAdapter(db ?? ({} as unknown as DrizzleD1Database<typeof schema>), {
      provider: 'sqlite',
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    secret: bindings?.BETTER_AUTH_SECRET || 'et-chess-dev-secret-super-secure-key-12345',
    baseURL: bindings?.BETTER_AUTH_URL || 'http://localhost:8787',
    plugins: [expo()],
    trustedOrigins: ['etchess://', 'exp://', 'http://localhost:3000', 'http://localhost:8787'],
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
    },
    databaseHooks: {
      user: {
        create: {
          after: async (createdUser) => {
            if (db) {
              try {
                await db
                  .insert(schema.profiles)
                  .values({
                    userId: createdUser.id,
                    displayName:
                      createdUser.name || createdUser.email.split('@')[0] || 'ChessPlayer',
                    rating: 1200,
                    gamesPlayed: 0,
                  })
                  .onConflictDoNothing();
              } catch (err) {
                console.error('Error creating profile for user in databaseHook:', err);
              }
            }
          },
        },
      },
    },
  });
}

export type AuthInstance = ReturnType<typeof createAuth>;
