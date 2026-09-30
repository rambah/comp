import { checkStatus, type WorkspaceAudit } from './workspace-types';

export function auditInsights(
  audit: WorkspaceAudit,
  today = new Date().toISOString().slice(0, 10),
) {
  const checks = audit.controls;
  const requests = checks.flatMap((check) => check.requests.map((r) => ({ ...r, check })));
  const responses = requests
    .filter((r) => r.status === 'submitted')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const outstanding = requests.filter((r) => r.status !== 'accepted');
  const overdue = outstanding
    .filter((r) => r.status !== 'submitted' && r.dueDate.slice(0, 10) < today)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const reviewed = checks.filter((c) => checkStatus(c) === 'reviewed').length;
  const excluded = checks.filter((c) => checkStatus(c) === 'not_sampled').length;
  const ready = checks.filter((c) => checkStatus(c) === 'ready').length;
  const waiting = checks.filter((c) => checkStatus(c) === 'waiting').length;
  const next =
    responses[0]?.check ??
    checks.find((c) => checkStatus(c) === 'ready') ??
    checks.find((c) => checkStatus(c) === 'open');
  const remaining = checks.length - reviewed - excluded;
  const undocumented = checks.filter((c) => !c.result || !c.notes?.trim()).length;
  return {
    reviewed,
    excluded,
    ready,
    waiting,
    remaining,
    undocumented,
    next,
    responses,
    outstanding,
    overdue,
    evidence: checks.reduce((n, c) => n + c.evidenceLinks.length, 0),
    progress: checks.length ? Math.round(((reviewed + excluded) / checks.length) * 100) : 0,
    findings: audit.findings.filter((f) => f.status !== 'closed').length,
    canComplete:
      checks.length > 0 &&
      remaining === 0 &&
      undocumented === 0 &&
      reviewed > 0 &&
      outstanding.length === 0 &&
      !!audit.conclusionVerdict &&
      !!audit.conclusionNotes?.trim(),
  };
}

export function auditActivity(audit: WorkspaceAudit) {
  return audit.controls
    .flatMap((check) => [
      ...(check.reviewedAt
        ? [
            {
              id: `review-${check.id}`,
              at: check.reviewedAt,
              title: `${check.reviewedBy || 'Auditor'} reviewed a check`,
              detail: check.controlRef,
              checkId: check.id,
            },
          ]
        : []),
      ...check.requests.flatMap((request) =>
        request.messages.map((message) => ({
          id: message.id,
          at: message.createdAt,
          title: `${message.authorName} ${message.status === 'accepted' ? 'accepted a response' : 'updated a request'}`,
          detail: check.controlRef,
          checkId: check.id,
        })),
      ),
      ...check.evidenceLinks.map((e) => ({
        id: e.id,
        at: e.createdAt,
        title: `${e.capturedBy} linked evidence`,
        detail: e.title,
        checkId: check.id,
      })),
    ])
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 4);
}
