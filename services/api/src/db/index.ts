import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

export * from './schema';

export function getDb(d1?: D1Database) {
  if (!d1) return null;
  return drizzle(d1, { schema });
}
