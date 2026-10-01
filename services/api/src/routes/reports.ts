import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { createReport, getReports } from '../data/store';
import { requireAdmin, requireAuth } from '../middleware/auth';
import type { AppEnv } from '../types';
import { createReportSchema } from '../validation/report.schema';

export const reportsRoute = new Hono<AppEnv>()
  .get('/', requireAdmin, async (c) => {
    const reports = await getReports(c.env?.DB);
    return c.json(reports, 200);
  })
  .post(
    '/',
    requireAuth,
    zValidator('json', createReportSchema, (result, c) => {
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
      const user = c.get('user')!;
      const data = c.req.valid('json');
      // Strictly derive reporterId from authenticated session user.id
      const report = await createReport(
        {
          ...data,
          reporterId: user.id,
        },
        c.env?.DB,
      );
      return c.json(report, 201);
    },
  );
