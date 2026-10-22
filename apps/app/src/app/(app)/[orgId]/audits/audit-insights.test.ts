import { describe, expect, it } from 'vitest';
import { auditActivity, auditInsights } from './audit-insights';
import { auditSearchItems } from './audit-search';
import type { AuditCheck, AuditRequest, WorkspaceAudit } from './workspace-types';
const check = (overrides: Partial<AuditCheck> = {}): AuditCheck => ({
  id: 'c1',
  auditId: 'a1',
  controlKey: 'scope',
  controlRef: 'Scope',
  whatWasTested: 'Boundaries',
  whereToFind: 'Documents',
  result: null,
  notes: null,
  source: 'manual',
  derivedFrom: null,
  position: 0,
  updatedAt: '2026-09-30T10:00:00Z',
  reviewedAt: null,
  reviewedBy: null,
  requests: [],
  evidenceLinks: [],
  ...overrides,
});
const request = (overrides: Partial<AuditRequest> = {}): AuditRequest => ({
  id: 'r1',
  controlId: 'c1',
  question: 'Provide a sample',
  ownerMemberId: 'm1',
  dueDate: '2026-09-29',
  status: 'open',
  createdBy: 'Auditor',
  createdAt: '2026-09-28T10:00:00Z',
  updatedAt: '2026-09-30T10:00:00Z',
  messages: [],
  ...overrides,
});
const audit = (controls: AuditCheck[]): WorkspaceAudit => ({
  id: 'a1',
  reference: 'IA-01',
  scope: 'ISMS',
  criteria: 'Policies',
  auditorName: 'Auditor',
  plannedStartDate: null,
  plannedEndDate: null,
  status: 'in_progress',
  conclusionVerdict: 'conform',
  conclusionNotes: 'Sample supports the conclusion.',
  signoffAuditorName: null,
  signoffAuditorDate: null,
  signoffSpoName: null,
  signoffSpoDate: null,
  signoffTopMgmtName: null,
  signoffTopMgmtDate: null,
  position: 0,
  controls,
  findings: [],
  documentId: 'd1',
  document: { id: 'd1', status: 'draft' },
  updatedAt: '2026-09-30T10:00:00Z',
});
describe('Auditor next steps and completion readiness', () => {
  it('prioritizes incoming responses ahead of untouched checks', () => {
    const info = auditInsights(
      audit([check(), check({ id: 'c2', requests: [request({ status: 'submitted' })] })]),
      '2026-09-30',
    );
    expect(info.next?.id).toBe('c2');
    expect(info.responses).toHaveLength(1);
    expect(info.overdue).toHaveLength(0);
  });
  it('does not treat a request due today or an accepted request as overdue', () => {
    const info = auditInsights(
      audit([
        check({
          requests: [
            request({ id: 'old' }),
            request({ id: 'today', dueDate: '2026-09-30' }),
            request({ id: 'done', status: 'accepted' }),
          ],
        }),
      ]),
      '2026-09-30',
    );
    expect(info.overdue.map((r) => r.id)).toEqual(['old']);
  });
  it('requires actual sampling and notes even when outcomes already exist', () => {
    expect(auditInsights(audit([])).canComplete).toBe(false);
    expect(
      auditInsights(audit([check({ result: 'not_sampled', notes: 'Outside sampling plan' })]))
        .canComplete,
    ).toBe(false);
    expect(auditInsights(audit([check({ result: 'conformity_confirmed' })])).canComplete).toBe(
      false,
    );
    expect(
      auditInsights(audit([check({ result: 'conformity_confirmed', notes: 'Sample A examined' })]))
        .canComplete,
    ).toBe(true);
  });
  it('counts explicit exclusions in progress without calling them reviewed', () => {
    const info = auditInsights(
      audit([
        check({ result: 'conformity_confirmed', notes: 'A' }),
        check({ id: 'c2', result: 'not_sampled', notes: 'Excluded' }),
        check({ id: 'c3' }),
      ]),
    );
    expect(info.progress).toBe(67);
    expect(info.reviewed).toBe(1);
    expect(info.excluded).toBe(1);
  });
});
describe('Cross-record audit search and activity', () => {
  const example = audit([
    check({
      evidenceLinks: [
        {
          id: 'e1',
          controlId: 'c1',
          sourceType: 'document',
          sourceId: 'd1',
          title: 'Scope v3',
          versionLabel: 'v3',
          snapshot: {},
          capturedBy: 'Owner',
          createdAt: '2026-09-29T10:00:00Z',
        },
      ],
      reviewedAt: '2026-09-30T10:00:00Z',
      reviewedBy: 'Auditor',
      requests: [request()],
    }),
  ]);
  it('opens the exact evidence in its parent check', () => {
    expect(auditSearchItems(example).find((i) => i.group === 'Evidence')).toMatchObject({
      checkId: 'c1',
      evidenceId: 'e1',
      tab: 'checks',
    });
    expect(auditSearchItems(example).find((i) => i.group === 'Requests')).toMatchObject({
      checkId: 'c1',
      evidenceId: null,
    });
  });
  it('shows the newest saved activity first', () => {
    expect(auditActivity(example).map((e) => e.id)).toEqual(['review-c1', 'e1']);
  });
});
