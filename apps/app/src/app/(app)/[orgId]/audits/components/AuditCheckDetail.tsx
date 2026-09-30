'use client';
import { usePermissions } from '@/hooks/use-permissions';
import { Badge, Button, Heading, Section, Text } from '@trycompai/design-system';
import { Add, Document, Launch } from '@trycompai/design-system/icons';
import Link from 'next/link';
import { useCallback, useState } from 'react';
import { checkSourceRoutes } from '../check-source-routes';
import {
  CHECK_LABELS,
  checkStatus,
  type AuditCheck,
  type WorkspaceAudit,
  type WorkspaceData,
  type WorkspaceMutation,
} from '../workspace-types';
import { AuditFindingDialog } from './AuditFindingDialog';
import { AuditRequestDialog } from './AuditRequestDialog';
import { AuditRequests } from './AuditRequests';
import { AuditReviewForm } from './AuditReviewForm';
import { EvidencePicker } from './EvidencePicker';
import { EvidenceSnapshot } from './EvidenceSnapshot';

export function AuditCheckDetail({
  check,
  audit,
  organizationId,
  members,
  canEdit,
  update,
  onRefresh,
  onBusyChange,
  onComplete,
  previewId,
  onPreviewChange,
}: {
  check: AuditCheck;
  audit: WorkspaceAudit;
  organizationId: string;
  members: WorkspaceData['members'];
  canEdit: boolean;
  previewId: string | null;
  onPreviewChange: (id: string | null) => void;
  update: WorkspaceMutation;
  onRefresh: () => Promise<unknown>;
  onBusyChange: (busy: boolean) => void;
  onComplete: () => void;
}) {
  const { hasPermission } = usePermissions();
  const canRecordFinding = canEdit && hasPermission('finding', 'create');
  const [dialog, setDialog] = useState<'request' | 'finding' | 'evidence' | null>(null);
  const preview = check.evidenceLinks.find((e) => e.id === previewId);
  const [busy, setBusy] = useState(false);
  const sourceRoutes = checkSourceRoutes({ controlKey: check.controlKey, organizationId });
  const handleBusy = useCallback(
    (value: boolean) => {
      setBusy(value);
      onBusyChange(value);
    },
    [onBusyChange],
  );
  return (
    <div data-audit-live-target="check-detail" className="space-y-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <Heading level="2">{check.controlRef}</Heading>
          <Badge variant="secondary">{CHECK_LABELS[checkStatus(check)]}</Badge>
        </div>
        <Text variant="muted">{check.whatWasTested}</Text>
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-7">
          <Section
            title="Where to look"
            description={check.whereToFind || 'Link the source records used to test this check.'}
          >
            <div className="flex flex-wrap gap-2">
              {sourceRoutes.map((route) => (
                <Button
                  key={route.href}
                  variant="outline"
                  size="sm"
                  iconRight={<Launch size={16} />}
                  render={<Link href={route.href} target="_blank" rel="noopener noreferrer" />}
                >
                  {route.label}
                </Button>
              ))}
            </div>
          </Section>
          <Section
            title="Linked evidence"
            description="Published document versions are captured when linked. File previews use the original attachment."
            actions={
              canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  iconLeft={<Add size={16} />}
                  onClick={() => setDialog('evidence')}
                >
                  Link evidence
                </Button>
              )
            }
          >
            <div className="space-y-3">
              {check.evidenceLinks.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between gap-3 rounded-lg border p-4"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <Document size={20} />
                    <div className="min-w-0">
                      <p className="break-words text-sm font-medium">{e.title}</p>
                      <Text size="xs" variant="muted">
                        {e.versionLabel} · Captured by {e.capturedBy}
                      </Text>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => onPreviewChange(e.id)}>
                    Preview
                  </Button>
                </div>
              ))}
              {!check.evidenceLinks.length && (
                <div className="rounded-lg border border-dashed p-6">
                  <Text size="sm" variant="muted">
                    No evidence linked yet. Open the suggested source or link a published document
                    or existing file.
                  </Text>
                </div>
              )}
            </div>
          </Section>
          <Section
            title="Questions and responses"
            actions={
              canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  iconLeft={<Add size={16} />}
                  onClick={() => setDialog('request')}
                >
                  Ask a question
                </Button>
              )
            }
          >
            <AuditRequests
              audit={audit}
              members={members}
              canEdit={canEdit && !busy}
              update={update}
              controlId={check.id}
              onSelect={() => undefined}
            />
          </Section>
        </div>
        <AuditReviewForm
          check={check}
          organizationId={organizationId}
          canEdit={canEdit}
          canRecordFinding={canRecordFinding}
          onBusyChange={handleBusy}
          onSaved={onRefresh}
          onComplete={onComplete}
          onFinding={() => setDialog('finding')}
        />
      </div>
      {dialog === 'request' && (
        <AuditRequestDialog
          controlId={check.id}
          members={members}
          update={update}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'finding' && canRecordFinding && (
        <AuditFindingDialog
          controlId={check.id}
          members={members}
          update={update}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'evidence' && (
        <EvidencePicker
          controlId={check.id}
          organizationId={organizationId}
          update={update}
          onClose={() => setDialog(null)}
        />
      )}
      {preview && (
        <EvidenceSnapshot
          organizationId={organizationId}
          evidence={preview}
          onClose={() => onPreviewChange(null)}
        />
      )}
    </div>
  );
}
