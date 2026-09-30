'use client';
import { Badge, Button, Input, Text } from '@trycompai/design-system';
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
  const [view, setView] = useState<'all' | 'submitted' | 'waiting' | 'accepted'>('all');
  const [search, setSearch] = useState('');
  const requests = audit.controls
    .filter((c) => !controlId || c.id === controlId)
    .flatMap((c) => c.requests.map((r) => ({ ...r, controlRef: c.controlRef })))
    .sort(
      (a, b) =>
        (a.status === 'submitted' ? -1 : a.status === 'accepted' ? 1 : 0) -
          (b.status === 'submitted' ? -1 : b.status === 'accepted' ? 1 : 0) ||
        a.dueDate.localeCompare(b.dueDate),
    );
  const visible = requests.filter(
    (r) =>
      (view === 'all' ||
        (view === 'waiting'
          ? r.status === 'open' || r.status === 'changes_requested'
          : r.status === view)) &&
      `${r.question} ${r.controlRef} ${members.find((m) => m.id === r.ownerMemberId)?.name || ''}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <div className="space-y-4">
      {!controlId && (
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-widest text-primary">
              Evidence inbox
            </p>
            <h2 className="text-xl font-semibold tracking-tight">Keep the conversation moving.</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Review new responses first. Every question stays connected to its check and owner.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { key: 'all', label: 'All requests' },
                  { key: 'submitted', label: 'To review' },
                  { key: 'waiting', label: 'Awaiting response' },
                  { key: 'accepted', label: 'Accepted' },
                ] as const
              ).map((item) => (
                <Button
                  key={item.key}
                  size="sm"
                  variant={view === item.key ? 'default' : 'outline'}
                  aria-pressed={view === item.key}
                  onClick={() => setView(item.key)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
            <div className="w-72 max-w-full">
              <Input
                aria-label="Search evidence requests"
                placeholder="Find a question or owner…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      )}
      {!!requests.length && !visible.length && (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="mb-3 text-sm text-muted-foreground">No requests match this view.</p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setView('all');
              setSearch('');
            }}
          >
            Clear filters
          </Button>
        </div>
      )}
      {!requests.length && (
        <div className="rounded-lg border border-dashed p-6">
          <Text size="sm" variant="muted">
            No evidence requests yet. Questions stay linked to the check they support.
          </Text>
        </div>
      )}
      {visible.map((r) => (
        <div key={r.id} className="space-y-4 rounded-xl border bg-background p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Text size="sm" weight="medium">
              {r.controlRef}
            </Text>
            <Badge variant={r.status === 'submitted' ? 'default' : 'secondary'}>
              {REQUEST_LABELS[r.status]}
            </Badge>
          </div>
          <p className="max-w-4xl whitespace-pre-wrap text-sm leading-6">{r.question}</p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Text size="xs" variant="muted">
              {members.find((m) => m.id === r.ownerMemberId)?.name ?? 'Former member'} · Due{' '}
              {formatAuditDate(r.dueDate)} · {r.messages.length}{' '}
              {r.messages.length === 1 ? 'response' : 'responses'}
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
