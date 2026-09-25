import { z } from 'zod';

export const userSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().trim().min(1, 'displayName is required'),
  createdAt: z.coerce.date(),
});

export const userListSchema = z.array(userSchema);

export type UserOutput = z.infer<typeof userSchema>;
