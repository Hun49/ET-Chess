import { z } from 'zod';

export const createReportSchema = z.object({
  reporterId: z.string().trim().min(1).optional(),
  reason: z.string().trim().min(1, 'reason is required'),
});

export const reportSchema = z.object({
  id: z.string().min(1),
  reporterId: z.string().min(1),
  reason: z.string().min(1),
  createdAt: z.coerce.date(),
});

export const reportListSchema = z.array(reportSchema);

export type CreateReportInput = z.infer<typeof createReportSchema>;
export type ReportOutput = z.infer<typeof reportSchema>;
