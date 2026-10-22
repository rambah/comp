import type { AuditLiveView } from './live/live-types';
import type { WorkspaceAudit } from './workspace-types';
export interface AuditSearchItem {
  id: string;
  title: string;
  detail: string;
  group: 'Checks' | 'Evidence' | 'Requests' | 'Findings';
  tab: AuditLiveView['tab'];
  checkId: string | null;
  evidenceId: string | null;
}
export function auditSearchItems(audit: WorkspaceAudit): AuditSearchItem[] {
  const checks = audit.controls.flatMap((c): AuditSearchItem[] => [
    {
      id: c.id,
      title: c.controlRef,
      detail: c.whatWasTested,
      group: 'Checks',
      tab: 'checks',
      checkId: c.id,
      evidenceId: null,
    },
    ...c.evidenceLinks.map((e): AuditSearchItem => ({
      id: e.id,
      title: e.title,
      detail: `${c.controlRef} · ${e.versionLabel}`,
      group: 'Evidence',
      tab: 'checks',
      checkId: c.id,
      evidenceId: e.id,
    })),
    ...c.requests.map((r): AuditSearchItem => ({
      id: r.id,
      title: r.question,
      detail: c.controlRef,
      group: 'Requests',
      tab: 'checks',
      checkId: c.id,
      evidenceId: null,
    })),
  ]);
  return [
    ...checks,
    ...audit.findings.map((f): AuditSearchItem => ({
      id: f.id,
      title: `${f.reference} · ${f.description}`,
      detail: f.clauseOrControl ?? '',
      group: 'Findings',
      tab: 'findings',
      checkId: null,
      evidenceId: null,
    })),
  ];
}
