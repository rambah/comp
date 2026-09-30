'use client';
import { apiClient } from '@/lib/api-client';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Text,
} from '@trycompai/design-system';
import { Add } from '@trycompai/design-system/icons';
import { useState } from 'react';
import useSWR from 'swr';
import type { EvidenceSource, WorkspaceMutation } from '../workspace-types';

export function EvidencePicker({
  organizationId,
  controlId,
  update,
  onClose,
}: {
  organizationId: string;
  controlId: string;
  update: WorkspaceMutation;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const { data, error, isLoading, mutate } = useSWR(
    ['audit-sources', organizationId, search],
    async () => {
      const res = await apiClient.get<{ sources: EvidenceSource[] }>(
        `/v1/audit-workspace/sources?search=${encodeURIComponent(search)}`,
        organizationId,
      );
      if (res.error || !res.data) throw new Error(res.error || 'Unable to find evidence.');
      return res.data.sources;
    },
    { keepPreviousData: true },
  );
  const handleLink = async (source: EvidenceSource) => {
    setSaving(source.id);
    try {
      await update({
        path: `checks/${controlId}/evidence`,
        body: { sourceType: source.type, sourceId: source.id },
      });
      onClose();
    } catch {
      /* Error surfaced by mutation hook. */
    } finally {
      setSaving(null);
    }
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !saving) onClose();
      }}
    >
      <DialogContent size="3xl">
        <DialogHeader>
          <DialogTitle>Link evidence</DialogTitle>
          <DialogDescription>
            Choose an existing file or a published document. Document content is captured at its
            published version.
          </DialogDescription>
        </DialogHeader>
        <Input
          aria-label="Search evidence sources"
          placeholder="Search policies, documents and files…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="max-h-[55dvh] space-y-2 overflow-y-auto">
          {isLoading && <Text variant="muted">Searching…</Text>}
          {error && (
            <div role="alert">
              <Text>Unable to load evidence.</Text>
              <Button variant="outline" onClick={() => void mutate()}>
                Try again
              </Button>
            </div>
          )}
          {data?.map((s) => (
            <div
              key={`${s.type}:${s.id}`}
              className="flex items-center justify-between gap-3 rounded-lg border p-3"
            >
              <div className="min-w-0">
                <p className="break-words text-sm font-medium">{s.title}</p>
                <Text size="xs" variant="muted">
                  {s.type} · {s.version}
                </Text>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={!!saving}
                loading={saving === s.id}
                aria-label={`Link ${s.title}`}
                iconLeft={<Add size={16} />}
                onClick={() => void handleLink(s)}
              >
                Link
              </Button>
            </div>
          ))}
          {!isLoading && !error && !data?.length && (
            <Text variant="muted">
              No sources found. Upload new files through Evidence, or publish the document first.
            </Text>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
