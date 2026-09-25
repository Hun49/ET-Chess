import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { createReport, getReports } from '../data/store';
import type { AppEnv } from '../types';
import { createReportSchema } from '../validation/report.schema';

export const reportsRoute = new Hono<AppEnv>()
  .get('/', async (c) => {
    const reports = await getReports(c.env?.DB);
    return c.json(reports, 200);
  })
  .post(
    '/',
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
      const data = c.req.valid('json');
      const report = await createReport(data, c.env?.DB);
      return c.json(report, 201);
    },
  );
