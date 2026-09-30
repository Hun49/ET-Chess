import { z } from 'zod';

export const createTournamentSchema = z.object({
  name: z.string().trim().min(3, 'Name must be at least 3 characters').max(50),
});

export type CreateTournamentInput = z.infer<typeof createTournamentSchema>;
