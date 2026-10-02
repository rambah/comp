import { z } from 'zod';

const sequence = z.number().int().nonnegative();
export const presenceMessageSchema = z
  .object({ kind: z.literal('presence'), sequence })
  .strict();
export const watchMessageSchema = z
  .object({
    kind: z.literal('watch'),
    sequence,
    targetNonce: z.string().uuid(),
    watching: z.boolean(),
    requestSnapshot: z.boolean(),
  })
  .strict();
export const domMessageSchema = z
  .object({
    kind: z.literal('dom'),
    sequence,
    epoch: z.string().uuid(),
    batch: z.number().int().nonnegative(),
    part: z.number().int().min(0).max(255),
    parts: z.number().int().min(1).max(256),
    payload: z
      .string()
      .min(1)
      .max(24000)
      .regex(/^[A-Za-z0-9+/]+={0,2}$/),
  })
  .strict();
