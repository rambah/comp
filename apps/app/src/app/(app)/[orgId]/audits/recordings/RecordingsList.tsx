'use client';
import { usePermissions } from '@/hooks/use-permissions';
import { apiClient } from '@/lib/api-client';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  PageHeader,
  PageHeaderDescription,
  PageLayout,
} from '@trycompai/design-system';
import Link from 'next/link';
import { useState } from 'react';
import useSWR from 'swr';
import { RecordingPlayer } from './RecordingPlayer';
import { type AuditRecording, durationLabel } from './recording-types';

export function RecordingsList({ organizationId }: { organizationId: string }) {
  const { hasPermission } = usePermissions();
  const allowed =
    hasPermission('auditRecording', 'read') && hasPermission('auditWorkspace', 'observe');
  const [cursor, setCursor] = useState<string | null>(null);
  const [selected, setSelected] = useState<AuditRecording | null>(null);
  const [deleting, setDeleting] = useState<AuditRecording | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const {
    data: page,
    error: loadError,
    isLoading,
    mutate,
  } = useSWR(
    allowed ? ['audit-recordings', organizationId, cursor] : null,
    async () => {
      const response = await apiClient.get<{ data: AuditRecording[]; nextCursor: string | null }>(
        `/v1/audit-recordings${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`,
        organizationId,
      );
      if (response.error || !response.data) throw new Error('Recordings could not be loaded.');
      return response.data;
    },
    { refreshInterval: 30_000 },
  );
  const data = page?.data;
  const handleDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    setError('');
    const response = await apiClient.delete(`/v1/audit-recordings/${deleting.id}`, organizationId);
    setBusy(false);
    if (response.error) {
      setError('The recording could not be deleted. Please try again.');
      return;
    }
    if (selected?.id === deleting.id) setSelected(null);
    setDeleting(null);
    await mutate();
  };
  if (!allowed) return null;
  return (
    <PageLayout
      padding="lg"
      maxWidth="2xl"
      header={
        <PageHeader title="Auditor recordings">
          <PageHeaderDescription>
            Private session history · Administrators only · Automatically deleted after 30 days
          </PageHeaderDescription>
        </PageHeader>
      }
    >
      <div data-audit-live-private className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" render={<Link href={`/${organizationId}/audits`} />}>
            Back to audit workspace
          </Button>
          <Button variant="outline" onClick={() => void mutate()} loading={isLoading}>
            Refresh
          </Button>
        </div>
        {selected && (
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-medium">{selected.auditorName}</h2>
                <p className="text-sm text-muted-foreground">
                  {new Date(selected.startedAt).toLocaleString()} · Saved portion
                </p>
              </div>
              <Button variant="ghost" onClick={() => setSelected(null)}>
                Close player
              </Button>
            </div>
            <RecordingPlayer key={selected.id} id={selected.id} organizationId={organizationId} />
          </section>
        )}
        <div className="rounded-xl border bg-card">
          <div className="border-b p-5">
            <h2 className="font-medium">Recent sessions</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              100 sections per page. Long sessions are split into sections of up to approximately 15
              minutes. Playback covers visible Comp pages. Passwords, private areas and embedded
              documents are excluded.
            </p>
          </div>
          {(isLoading || loadError || !data?.length) && (
            <p role="status" className="p-8 text-sm text-muted-foreground">
              {loadError
                ? 'Could not load recordings. Please refresh.'
                : isLoading
                  ? 'Loading sessions…'
                  : 'No recordings yet. New auditor sessions will appear here automatically.'}
            </p>
          )}
          {Array.isArray(data) &&
            data.map((recording) => (
              <div
                key={recording.id}
                className="flex flex-wrap items-center justify-between gap-4 border-b p-5 last:border-b-0"
              >
                <div className="space-y-1">
                  <p className="font-medium">{recording.auditorName}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(recording.startedAt).toLocaleString()} ·{' '}
                    {durationLabel(
                      new Date(recording.lastEventAt).getTime() -
                        new Date(recording.startedAt).getTime(),
                    )}
                    {' · '}
                    {recording.state === 'recording'
                      ? 'In progress'
                      : recording.state === 'interrupted'
                        ? 'Interrupted · saved portion available'
                        : 'Completed'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Expires {new Date(recording.expiresAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setSelected(recording)}>
                    Watch recording
                  </Button>
                  {hasPermission('auditRecording', 'delete') && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setError('');
                        setDeleting(recording);
                      }}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            ))}
        </div>
        <div className="flex justify-between gap-3">
          <Button variant="outline" disabled={!cursor} onClick={() => setCursor(null)}>
            Latest recordings
          </Button>
          <Button
            variant="outline"
            disabled={!page?.nextCursor}
            onClick={() => setCursor(page?.nextCursor ?? null)}
          >
            Older recordings
          </Button>
        </div>
        <Dialog
          open={!!deleting}
          onOpenChange={(open) => {
            if (!open && !busy) setDeleting(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete this recording?</DialogTitle>
              <DialogDescription>
                The saved session will be permanently removed. Your audit records and evidence
                remain unchanged.
              </DialogDescription>
            </DialogHeader>
            {error && <p role="alert">{error}</p>}
            <DialogFooter>
              <Button variant="outline" disabled={busy} onClick={() => setDeleting(null)}>
                Cancel
              </Button>
              <Button loading={busy} onClick={() => void handleDelete()}>
                Delete recording
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageLayout>
  );
}
