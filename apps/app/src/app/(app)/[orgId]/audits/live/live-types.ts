import { z } from 'zod';
import type { PanelScroll } from './panel-scroll';
export interface AuditLiveView {
  auditId: string;
  revision?: string;
  tab: 'checks' | 'sources' | 'evidence' | 'requests' | 'findings' | 'report' | 'research';
  checkId: string | null;
  evidenceId: string | null;
  compareEvidenceId?: string | null;
  checkLayout?: 'list' | 'board';
  panelScroll?: PanelScroll;
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
  z.object({ ...base, kind: z.literal('presence'), sequence: z.number() }),
  z.object({
    ...base,
    kind: z.literal('watch'),
    sequence: z.number(),
    targetNonce: z.string(),
    watching: z.boolean(),
    requestSnapshot: z.boolean(),
  }),
  z.object({
    ...base,
    kind: z.literal('dom'),
    sequence: z.number(),
    epoch: z.string(),
    batch: z.number().int().nonnegative(),
    part: z.number().int().nonnegative(),
    parts: z.number().int().min(1).max(256),
    payload: z.string().max(24000),
  }),
  z.object({
    ...base,
    kind: z.literal('view'),
    sequence: z.number(),
    view: z.object({
      auditId: z.string(),
      revision: z.string().optional(),
      tab: z.enum(['checks', 'sources', 'evidence', 'requests', 'findings', 'report', 'research']),
      checkId: z.string().nullable(),
      evidenceId: z.string().nullable(),
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
