'use client';
import { Button, Heading, Text } from '@trycompai/design-system';
import { Download } from '@trycompai/design-system/icons';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { buildAuditRecord } from '../audit-report';
import type { WorkspaceMutation } from '../workspace-types';
import { checkStatus, type WorkspaceAudit, type WorkspaceData } from '../workspace-types';
import { AuditConclusionForm } from './AuditConclusionForm';
import { AuditFinishDialog } from './AuditFinishDialog';

export function AuditReport({
  audit,
  members,
  registerUrl,
  canEdit,
  update,
  onBusyChange,
}: {
  onBusyChange: (busy: boolean) => void;
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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Heading level="2">Audit record</Heading>
          <Text variant="muted">
            Your checks, evidence references, questions and findings in one working record.
          </Text>
        </div>
        <Button variant="outline" iconLeft={<Download size={16} />} onClick={handleDownload}>
          Download working record
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          [`${reviewed} / ${audit.controls.length}`, 'Checks reviewed'],
          [String(notSampled), 'Not sampled'],
          [String(pending), 'Requests not yet accepted'],
        ].map(([value, label]) => (
          <div key={label} className="space-y-1 rounded-lg border p-5">
            <Text size="lg" weight="medium">
              {value}
            </Text>
            <Text size="sm" variant="muted">
              {label}
            </Text>
          </div>
        ))}
      </div>
      <div className="space-y-4 rounded-lg border p-5">
        <Heading level="3">Scope and criteria</Heading>
        <p className="whitespace-pre-wrap text-sm">{audit.scope}</p>
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">{audit.criteria}</p>
      </div>
      <div className="space-y-4 rounded-lg border p-5">
        <Heading level="3">Before sign-off</Heading>
        <Text size="sm">
          {audit.controls.length - reviewed - notSampled} checks still need a recorded outcome.{' '}
          {pending} requests remain open or await review.
        </Text>
        <Text size="sm" variant="muted">
          Open findings can remain in the report with an agreed action plan. Overall conclusions,
          sign-off and publication use the existing audit programme approval process.
        </Text>
        {audit.conclusionNotes && (
          <p className="whitespace-pre-wrap text-sm">{audit.conclusionNotes}</p>
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
            disabled={
              dirty ||
              pending > 0 ||
              reviewed === 0 ||
              audit.controls.length - reviewed - notSampled > 0 ||
              !audit.conclusionVerdict ||
              !audit.conclusionNotes?.trim()
            }
          />
        )}
        {audit.signoffAuditorName && (
          <Text size="sm">
            Audit completed by {audit.signoffAuditorName} · {audit.signoffAuditorDate?.slice(0, 10)}
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
      </div>
    </div>
  );
}
