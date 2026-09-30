'use client';
import { Badge, Button, Text } from '@trycompai/design-system';
import { ArrowRight, Chat } from '@trycompai/design-system/icons';
import { useState } from 'react';
import {
  REQUEST_LABELS,
  formatAuditDate,
  type AuditRequest,
  type WorkspaceAudit,
  type WorkspaceData,
  type WorkspaceMutation,
} from '../workspace-types';
import { AuditResponseDialog } from './AuditResponseDialog';

export function AuditRequests({
  audit,
  members,
  canEdit,
  update,
  onSelect,
  controlId,
}: {
  audit: WorkspaceAudit;
  members: WorkspaceData['members'];
  canEdit: boolean;
  update: WorkspaceMutation;
  onSelect: (id: string) => void;
  controlId?: string;
}) {
  const [selected, setSelected] = useState<AuditRequest | null>(null);
  const requests = audit.controls
    .filter((c) => !controlId || c.id === controlId)
    .flatMap((c) => c.requests.map((r) => ({ ...r, controlRef: c.controlRef })))
    .sort(
      (a, b) =>
        (a.status === 'accepted' ? 1 : 0) - (b.status === 'accepted' ? 1 : 0) ||
        a.dueDate.localeCompare(b.dueDate),
    );
  return (
    <div className="space-y-3">
      {!requests.length && (
        <div className="rounded-lg border border-dashed p-6">
          <Text size="sm" variant="muted">
            No evidence requests yet. Questions stay linked to the check they support.
          </Text>
        </div>
      )}
      {requests.map((r) => (
        <div key={r.id} className="space-y-3 rounded-lg border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Text size="sm" weight="medium">
              {r.controlRef}
            </Text>
            <Badge variant={r.status === 'submitted' ? 'default' : 'secondary'}>
              {REQUEST_LABELS[r.status]}
            </Badge>
          </div>
          <p className="whitespace-pre-wrap text-sm">{r.question}</p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Text size="xs" variant="muted">
              {members.find((m) => m.id === r.ownerMemberId)?.name ?? 'Former member'} · Due{' '}
              {formatAuditDate(r.dueDate)} · {r.messages.length} responses
            </Text>
            <div className="flex gap-2">
              {!controlId && (
                <Button
                  variant="ghost"
                  size="sm"
                  iconRight={<ArrowRight size={16} />}
                  onClick={() => onSelect(r.controlId)}
                >
                  Open check
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                iconLeft={<Chat size={16} />}
                onClick={() => setSelected(r)}
              >
                {canEdit
                  ? r.status === 'submitted'
                    ? 'Review response'
                    : 'Open request'
                  : 'View request'}
              </Button>
            </div>
          </div>
        </div>
      ))}
      {selected && (
        <AuditResponseDialog
          request={selected}
          canEdit={canEdit}
          update={update}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
