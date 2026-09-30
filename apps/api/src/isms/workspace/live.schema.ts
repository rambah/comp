import { z } from 'zod';

export const LIVE_NOTICE_VERSION = 1;
export const liveViewSchema = z
  .object({
    auditId: z.string().min(1).max(100),
    revision: z.string().max(100).optional(),
    tab: z.enum(['checks', 'evidence', 'requests', 'findings', 'report']),
    checkId: z.string().max(100).nullable(),
    evidenceId: z.string().max(100).nullable(),
    compareEvidenceId: z.string().max(100).nullable().optional(),
    checkLayout: z.enum(['list', 'board']).optional(),
    panelScroll: z
      .object({
        'evidence-preview': z.number().min(0).max(1).optional(),
        'evidence-comparison': z.number().min(0).max(1).optional(),
        'compare-0': z.number().min(0).max(1).optional(),
        'compare-1': z.number().min(0).max(1).optional(),
      })
      .strict()
      .optional(),
    scrollRatio: z.number().min(0).max(1),
  })
  .strict();
export const pointerSchema = z
  .object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    visible: z.boolean(),
    anchor: z.string().max(150).optional(),
  })
  .strict();
export const liveMessageSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('view'),
      sequence: z.number().int().nonnegative(),
      view: liveViewSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal('pointer'),
      sequence: z.number().int().nonnegative(),
      pointer: pointerSchema,
    })
    .strict(),
]);
export type LiveMessage = z.infer<typeof liveMessageSchema>;
export interface LiveIdentity {
  organizationId: string;
  memberId: string;
  sessionId: string;
  name: string;
  mode: 'publish' | 'observe';
  nonce: string;
}
export type LiveEvent = {
  organizationId: string;
  memberId: string;
  name: string;
  nonce: string;
  sentAt: number;
} & (LiveMessage | { kind: 'stop'; revoked?: boolean });
