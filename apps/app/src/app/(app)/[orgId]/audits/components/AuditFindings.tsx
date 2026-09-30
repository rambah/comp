'use client';
import { Badge, Button, Text } from '@trycompai/design-system';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { WorkspaceMutation } from '../workspace-types';
import { formatAuditDate, type WorkspaceAudit, type WorkspaceData } from '../workspace-types';
import { findingTypes } from './AuditFindingDialog';
import { AuditFollowupDialog } from './AuditFollowupDialog';
export function AuditFindings({
  audit,
  focus,
  members,
  onSelect,
  registerUrl,
  canEdit,
  update,
}: {
  focus?: { id: string } | null;
  canEdit: boolean;
  update: WorkspaceMutation;
  audit: WorkspaceAudit;
  members: WorkspaceData['members'];
  onSelect: (id: string) => void;
  registerUrl: string;
}) {
  const focusId = focus?.id;
  const [selected, setSelected] = useState<WorkspaceAudit['findings'][number] | null>(null);
  const [view, setView] = useState<'all' | 'open' | 'closed'>('all');
  useEffect(() => {
    if (!focusId) return;
    setView('all');
    const frame = requestAnimationFrame(() =>
      document.getElementById(`audit-finding-${focusId}`)?.scrollIntoView({ block: 'center' }),
    );
    return () => cancelAnimationFrame(frame);
  }, [focus, focusId]);
  const visible = audit.findings.filter(
    (f) => view === 'all' || (view === 'closed' ? f.status === 'closed' : f.status !== 'closed'),
  );
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-widest text-primary">
            Findings & follow-up
          </p>
          <h2 className="text-xl font-semibold tracking-tight">From observation to resolution.</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            A clear owner, a next action and evidence of closure.
          </p>
        </div>
        <Button variant="outline" render={<Link href={registerUrl} />}>
          View audit programme
        </Button>
      </div>
      <div className="flex gap-2">
        {(['open', 'closed', 'all'] as const).map((key) => (
          <Button
            key={key}
            size="sm"
            variant={view === key ? 'default' : 'outline'}
            aria-pressed={view === key}
            onClick={() => setView(key)}
          >
            {key === 'open' ? 'Needs follow-up' : key === 'closed' ? 'Closed' : 'All findings'}{' '}
            <span className="ml-1 opacity-70">
              {
                audit.findings.filter(
                  (f) =>
                    key === 'all' ||
                    (key === 'closed' ? f.status === 'closed' : f.status !== 'closed'),
                ).length
              }
            </span>
          </Button>
        ))}
      </div>
      {!!audit.findings.length && !visible.length && (
        <div className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">
          No findings in this view.
        </div>
      )}
      {!audit.findings.length && (
        <div className="rounded-lg border border-dashed p-8">
          <Text variant="muted">
            No findings recorded. Raise a finding from the relevant check.
          </Text>
        </div>
      )}
      {visible.map((f) => (
        <div
          key={f.id}
          id={`audit-finding-${f.id}`}
          className={`space-y-4 rounded-xl border bg-background p-6 shadow-sm ${focusId === f.id ? 'ring-1 ring-primary/40' : ''}`}
        >
          <div className="flex flex-wrap justify-between gap-2">
            <Text weight="medium">
              {f.reference} · {findingTypes[f.type]}
            </Text>
            <Badge variant="secondary">{f.status.replaceAll('_', ' ')}</Badge>
          </div>
          <p className="max-w-4xl whitespace-pre-wrap text-sm leading-7">{f.description}</p>
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
