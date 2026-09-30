'use client';
import { Button, Heading, Text } from '@trycompai/design-system';
import { Download } from '@trycompai/design-system/icons';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { auditInsights } from '../audit-insights';
import { buildAuditRecord } from '../audit-report';
import type { WorkspaceMutation } from '../workspace-types';
import { checkStatus, type WorkspaceAudit, type WorkspaceData } from '../workspace-types';
import { AuditConclusionForm } from './AuditConclusionForm';
import { AuditFinishDialog } from './AuditFinishDialog';
import { AuditMetric, AuditSectionHeading } from './AuditPresentation';
import { AuditReadiness } from './AuditReadiness';

export function AuditReport({
  audit,
  members,
  registerUrl,
  canEdit,
  update,
  onBusyChange,
  onChecks,
  onRequests,
}: {
  onBusyChange: (busy: boolean) => void;
  onChecks: () => void;
  onRequests: () => void;
  canEdit: boolean;
  update: WorkspaceMutation;
  audit: WorkspaceAudit;
  members: WorkspaceData['members'];
  registerUrl: string;
}) {
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    onBusyChange(dirty);
    return () => onBusyChange(false);
  }, [dirty, onBusyChange]);
  const reviewed = audit.controls.filter((c) => checkStatus(c) === 'reviewed').length;
  const notSampled = audit.controls.filter((c) => checkStatus(c) === 'not_sampled').length;
  const pending = audit.controls
    .flatMap((c) => c.requests)
    .filter((r) => r.status !== 'accepted').length;
  const handleDownload = () => {
    const url = URL.createObjectURL(
      new Blob([buildAuditRecord({ audit, members })], { type: 'text/markdown;charset=utf-8' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `${audit.reference}-working-record.md`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <div className="space-y-6">
      <AuditSectionHeading
        eyebrow="The audit record"
        title="Bring your work together."
        description="Your sampling, evidence and findings — with a clear path to completion."
        actions={
          <Button variant="outline" iconLeft={<Download size={16} />} onClick={handleDownload}>
            Download working record
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          [`${reviewed} / ${audit.controls.length}`, 'Checks reviewed'],
          [String(notSampled), 'Not sampled'],
          [String(pending), 'Requests not yet accepted'],
        ].map(([value, label]) => (
          <AuditMetric key={label} value={value} label={label} />
        ))}
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="audit-surface min-w-0 space-y-6 p-5 sm:p-8">
          <div className="audit-detail-heading space-y-2">
            <Heading level="3">Your overall conclusion</Heading>
            <p className="text-sm leading-6 text-muted-foreground">
              Summarise what your sampling supports, where limitations remain, and which findings
              need follow-up.
            </p>
          </div>
          {!canEdit && (
            <p className="whitespace-pre-wrap text-sm leading-7">
              {audit.conclusionNotes || 'No overall conclusion recorded yet.'}
            </p>
          )}
          {canEdit && (
            <AuditConclusionForm
              key={audit.id}
              audit={audit}
              update={update}
              onDirtyChange={setDirty}
            />
          )}
          {canEdit && audit.status !== 'complete' && (
            <AuditFinishDialog
              audit={audit}
              update={update}
              disabled={dirty || !auditInsights(audit).canComplete}
            />
          )}
          {audit.signoffAuditorName && (
            <Text size="sm">
              Audit completed by {audit.signoffAuditorName} ·{' '}
              {audit.signoffAuditorDate?.slice(0, 10)}
            </Text>
          )}
          <Text size="xs" variant="muted">
            Editing the checks or conclusion reopens the working audit and requires fresh sign-off.
            Previously published versions remain unchanged.
          </Text>
          <Button
            variant="outline"
            render={<Link href={registerUrl} target="_blank" rel="noopener noreferrer" />}
          >
            View audit programme and sign-off
          </Button>
        </section>
        <div className="space-y-5">
          <AuditReadiness
            audit={audit}
            disabled={dirty}
            onChecks={onChecks}
            onRequests={onRequests}
          />
          <section className="audit-surface space-y-4 p-6">
            <h3 className="text-sm font-semibold">Scope & criteria</h3>
            <p className="whitespace-pre-wrap text-xs leading-6 text-muted-foreground">
              {audit.scope}
            </p>
            <div className="border-t pt-4">
              <p className="whitespace-pre-wrap text-xs leading-6">{audit.criteria}</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
