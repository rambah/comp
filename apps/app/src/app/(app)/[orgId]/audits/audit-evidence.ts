import { snapshotText } from './snapshot-text';
import type { AuditCheck, EvidenceLink, WorkspaceAudit } from './workspace-types';

export const SOURCE_LABELS = { document: 'Document', policy: 'Policy', attachment: 'File' };
export interface EvidenceEntry {
  evidence: EvidenceLink;
  check: Pick<AuditCheck, 'id' | 'controlRef'>;
}
export function evidenceEntries(audit: WorkspaceAudit): EvidenceEntry[] {
  return audit.controls
    .flatMap((check) => check.evidenceLinks.map((evidence) => ({ evidence, check })))
    .sort((a, b) => b.evidence.createdAt.localeCompare(a.evidence.createdAt));
}
export function hasCapturedText(evidence: EvidenceLink) {
  return (
    evidence.sourceType !== 'attachment' &&
    !evidence.snapshot.pdfOnly &&
    !!snapshotText(evidence.snapshot.content).trim()
  );
}
export function comparableEvidence({
  entry,
  entries,
}: {
  entry: EvidenceEntry;
  entries: EvidenceEntry[];
}) {
  if (!hasCapturedText(entry.evidence)) return [];
  return entries.filter(
    ({ evidence }) =>
      evidence.id !== entry.evidence.id &&
      evidence.sourceId === entry.evidence.sourceId &&
      evidence.sourceType === entry.evidence.sourceType &&
      evidence.versionLabel !== entry.evidence.versionLabel &&
      hasCapturedText(evidence),
  );
}
export function evidenceCitation(evidence: EvidenceLink) {
  return `${evidence.title} — ${evidence.versionLabel}. Source: ${evidence.sourceId}. Captured ${evidence.createdAt}.`;
}
export function buildEvidenceIndex(audit: WorkspaceAudit) {
  // Quote every field and neutralize spreadsheet formulas in untrusted titles/labels.
  const cell = (value: string) =>
    `"${(/^[\s]*[=+@-]/.test(value) ? "'" + value : value).replaceAll('"', '""')}"`;
  const rows = [
    [
      'Audit',
      'Check',
      'Evidence',
      'Type',
      'Version',
      'Captured at',
      'Captured by',
      'Source ID',
      'Evidence ID',
    ],
    ...evidenceEntries(audit).map(({ check, evidence: e }) => [
      audit.reference,
      check.controlRef,
      e.title,
      SOURCE_LABELS[e.sourceType],
      e.versionLabel,
      e.createdAt,
      e.capturedBy,
      e.sourceId,
      e.id,
    ]),
  ];
  return '\ufeff' + rows.map((row) => row.map(cell).join(',')).join('\r\n');
}
