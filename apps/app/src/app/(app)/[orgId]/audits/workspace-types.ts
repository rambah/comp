import type { IsmsAudit, IsmsAuditControl, IsmsAuditFinding } from '../documents/isms/isms-types';

export type RequestStatus = 'open' | 'submitted' | 'changes_requested' | 'accepted';
export interface AuditRequest {
  id: string;
  controlId: string;
  question: string;
  ownerMemberId: string;
  dueDate: string;
  status: RequestStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  messages: {
    id: string;
    content: string;
    authorName: string;
    authorMemberId: string | null;
    status: RequestStatus;
    createdAt: string;
  }[];
}
export interface EvidenceLink {
  id: string;
  controlId: string;
  sourceType: 'attachment' | 'policy' | 'document';
  sourceId: string;
  title: string;
  versionLabel: string;
  snapshot: Record<string, unknown>;
  capturedBy: string;
  createdAt: string;
}
export interface AuditCheck extends IsmsAuditControl {
  updatedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  requests: AuditRequest[];
  evidenceLinks: EvidenceLink[];
}
export interface WorkspaceAudit extends Omit<IsmsAudit, 'controls' | 'findings'> {
  updatedAt: string;
  findings: (IsmsAuditFinding & { updatedAt: string })[];
  documentId: string;
  document: { id: string; status: string };
  controls: AuditCheck[];
}
export interface WorkspaceData {
  audits: WorkspaceAudit[];
  documentId: string | null;
  members: { id: string; name: string; canRespond: boolean }[];
}
export interface EvidenceSource {
  id: string;
  title: string;
  type: EvidenceLink['sourceType'];
  version: string;
}
export type WorkspaceMutation = (args: {
  path: string;
  body: unknown;
  method?: 'post' | 'patch';
}) => Promise<void>;

export const REQUEST_LABELS: Record<RequestStatus, string> = {
  open: 'Awaiting response',
  submitted: 'Response received',
  changes_requested: 'Changes requested',
  accepted: 'Accepted',
};
export type CheckStatus = 'open' | 'ready' | 'waiting' | 'reviewed' | 'not_sampled';
export const CHECK_LABELS: Record<CheckStatus, string> = {
  open: 'Not started',
  ready: 'Ready for review',
  waiting: 'Awaiting response',
  reviewed: 'Reviewed',
  not_sampled: 'Not sampled',
};
export function checkStatus(check: AuditCheck): CheckStatus {
  if (check.requests.some((r) => r.status === 'open' || r.status === 'changes_requested'))
    return 'waiting';
  if (check.requests.some((r) => r.status === 'submitted')) return 'ready';
  if (check.result === 'not_sampled') return 'not_sampled';
  if (check.result) return 'reviewed';
  if (check.evidenceLinks.length || check.notes?.trim()) return 'ready';
  return 'open';
}
export function nextCheck(audit: WorkspaceAudit) {
  return (
    audit.controls.find((c) => checkStatus(c) === 'ready') ??
    audit.controls.find((c) => checkStatus(c) === 'open')
  );
}
export function formatAuditDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'UTC' }).format(
        new Date(value),
      )
    : 'Not set';
}

export function auditRevision(audit: WorkspaceAudit) {
  return [
    audit.updatedAt,
    ...audit.controls.map((c) => c.updatedAt),
    ...audit.findings.map((f) => f.updatedAt),
  ]
    .sort()
    .at(-1);
}

export function formatAuditDateTime(value: string) {
  return (
    new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'UTC',
    }).format(new Date(value)) + ' UTC'
  );
}
