import { z } from 'zod';
export interface AuditLiveView {
  auditId: string;
  revision?: string;
  tab: 'checks' | 'requests' | 'findings' | 'report';
  checkId: string | null;
  evidenceId: string | null;
  scrollRatio: number;
}
export interface AuditPointer {
  x: number;
  y: number;
  visible: boolean;
  anchor?: string;
}
const base = { memberId: z.string(), name: z.string(), nonce: z.string(), sentAt: z.number() };
export const liveEventSchema = z.discriminatedUnion('kind', [
  z.object({
    ...base,
    kind: z.literal('view'),
    sequence: z.number(),
    view: z.object({
      auditId: z.string(),
      revision: z.string().optional(),
      tab: z.enum(['checks', 'requests', 'findings', 'report']),
      checkId: z.string().nullable(),
      evidenceId: z.string().nullable(),
      scrollRatio: z.number().min(0).max(1),
    }),
  }),
  z.object({
    ...base,
    kind: z.literal('pointer'),
    sequence: z.number(),
    pointer: z.object({
      x: z.number().min(0).max(1),
      y: z.number().min(0).max(1),
      visible: z.boolean(),
      anchor: z.string().max(150).optional(),
    }),
  }),
  z.object({ ...base, kind: z.literal('stop') }),
]);
export type AuditLiveEvent = z.infer<typeof liveEventSchema>;
export interface LiveParticipant {
  memberId: string;
  name: string;
  nonce: string;
  view: AuditLiveView;
  receivedAt: number;
  sequence: number;
}
