'use client';
import { Badge, Button, Text } from '@trycompai/design-system';
import Link from 'next/link';
import { useState } from 'react';
import type { WorkspaceMutation } from '../workspace-types';
import { formatAuditDate, type WorkspaceAudit, type WorkspaceData } from '../workspace-types';
import { findingTypes } from './AuditFindingDialog';
import { AuditFollowupDialog } from './AuditFollowupDialog';
export function AuditFindings({
  audit,
  members,
  onSelect,
  registerUrl,
  canEdit,
  update,
}: {
  canEdit: boolean;
  update: WorkspaceMutation;
  audit: WorkspaceAudit;
  members: WorkspaceData['members'];
  onSelect: (id: string) => void;
  registerUrl: string;
}) {
  const [selected, setSelected] = useState<WorkspaceAudit['findings'][number] | null>(null);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Text size="sm" variant="muted">
          These are the same findings used by the audit programme and report.
        </Text>
        <Button variant="outline" render={<Link href={registerUrl} />}>
          View audit programme
        </Button>
      </div>
      {!audit.findings.length && (
        <div className="rounded-lg border border-dashed p-8">
          <Text variant="muted">
            No findings recorded. Raise a finding from the relevant check.
          </Text>
        </div>
      )}
      {audit.findings.map((f) => (
        <div key={f.id} className="space-y-3 rounded-lg border p-5">
          <div className="flex flex-wrap justify-between gap-2">
            <Text weight="medium">
              {f.reference} · {findingTypes[f.type]}
            </Text>
            <Badge variant="secondary">{f.status.replaceAll('_', ' ')}</Badge>
          </div>
          <p className="whitespace-pre-wrap text-sm">{f.description}</p>
          <Text size="xs" variant="muted">
            {f.clauseOrControl} ·{' '}
            {members.find((m) => m.id === f.ownerMemberId)?.name || 'Unassigned'} · Due{' '}
            {formatAuditDate(f.dueDate)}
          </Text>
          {f.closureEvidence && (
            <p className="whitespace-pre-wrap rounded-md bg-muted/30 p-3 text-sm">
              Closure evidence: {f.closureEvidence}
            </p>
          )}
          {canEdit && (
            <Button variant="outline" size="sm" onClick={() => setSelected(f)}>
              Update follow-up
            </Button>
          )}
          {f.controlId && (
            <Button variant="outline" size="sm" onClick={() => onSelect(f.controlId!)}>
              Open related check
            </Button>
          )}
        </div>
      ))}
      {selected && (
        <AuditFollowupDialog finding={selected} update={update} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
