import { Hono } from 'hono';
import { getUsers } from '../data/store';
import type { AppEnv } from '../types';

export const usersRoute = new Hono<AppEnv>().get('/', async (c) => {
  const users = await getUsers(c.env?.DB);
  return c.json(users, 200);
});
