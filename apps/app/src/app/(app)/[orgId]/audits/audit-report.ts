import { CONTROL_RESULT_LABELS } from '../documents/isms/components/internal-audit-constants';
import { snapshotText } from './snapshot-text';
import { REQUEST_LABELS, type WorkspaceAudit, type WorkspaceData } from './workspace-types';

export function buildAuditRecord({
  audit,
  members,
}: {
  audit: WorkspaceAudit;
  members: WorkspaceData['members'];
}) {
  const lines = [
    `# Internal audit ${audit.reference}`,
    '',
    'Working audit record — not a signed or approved report.',
    '',
    `Scope: ${audit.scope}`,
    `Criteria: ${audit.criteria}`,
    `Auditor: ${audit.auditorName ?? 'Not assigned'}`,
    `Planned period: ${audit.plannedStartDate?.slice(0, 10) ?? 'Not set'} to ${audit.plannedEndDate?.slice(0, 10) ?? 'Not set'}`,
    '',
    '## Checks',
  ];
  for (const c of audit.controls) {
    lines.push(
      '',
      `### ${c.controlRef}`,
      c.whatWasTested,
      '',
      `Result: ${c.result ? CONTROL_RESULT_LABELS[c.result] : 'Not reviewed'}`,
      c.notes || 'No review notes recorded.',
      `Reviewed by: ${c.reviewedBy || 'Not recorded'}; at: ${c.reviewedAt || 'Not recorded'}`,
      '',
      'Evidence:',
    );
    for (const e of c.evidenceLinks)
      lines.push(
        `- ${e.title} — ${e.versionLabel}; source ${e.sourceId}; captured ${e.createdAt} by ${e.capturedBy}`,
      );
    for (const r of c.requests) {
      lines.push(
        '',
        `Request: ${r.question}`,
        `Status: ${REQUEST_LABELS[r.status]}; coordinator: ${members.find((m) => m.id === r.ownerMemberId)?.name ?? r.ownerMemberId}; due: ${r.dueDate.slice(0, 10)}`,
      );
      for (const message of r.messages)
        lines.push(
          `${message.createdAt} · ${message.authorName} · ${REQUEST_LABELS[message.status]}: ${message.content}`,
        );
    }
  }
  lines.push('', '## Findings');
  for (const f of audit.findings)
    lines.push(
      '',
      `### ${f.reference} · ${f.type}`,
      `${f.clauseOrControl ?? ''}\n${f.description}`,
      `Status: ${f.status}; owner: ${members.find((m) => m.id === f.ownerMemberId)?.name ?? 'Unassigned'}; due: ${f.dueDate?.slice(0, 10) ?? 'Not set'}`,
      `Closure evidence: ${f.closureEvidence ?? 'Not recorded'}`,
    );
  lines.push(
    '',
    '## Overall conclusion',
    audit.conclusionVerdict ?? 'Not recorded',
    audit.conclusionNotes ?? '',
    '',
    '## Captured document text',
  );
  for (const c of audit.controls)
    for (const e of c.evidenceLinks.filter((e) => e.sourceType !== 'attachment'))
      lines.push('', `### ${e.title} · ${e.versionLabel}`, snapshotText(e.snapshot.content));
  return lines.join('\n');
}
