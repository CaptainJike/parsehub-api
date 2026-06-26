import { z } from 'zod';
import { enabledPlatforms } from '../../providers/platforms';

export const parseRequestSchema = z.object({
  platform: z.union([z.literal('auto'), z.enum(enabledPlatforms)]).default('auto'),
  input: z.string().min(1).max(3000)
});

export type ParseRequestBody = z.infer<typeof parseRequestSchema>;
