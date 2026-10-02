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
import useSWRInfinite from 'swr/infinite';
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
  const {
    data: pages,
    error,
    isLoading,
    isValidating,
    mutate,
    setSize,
  } = useSWRInfinite<{
    sources: EvidenceSource[];
    nextOffset: number | null;
  }>(
    (index, previous) =>
      index > 0 && previous?.nextOffset == null
        ? null
        : ['audit-sources', organizationId, search, index === 0 ? 0 : previous.nextOffset],
    async ([, org, query, offset]: [string, string, string, number]) => {
      const res = await apiClient.get<{ sources: EvidenceSource[]; nextOffset: number | null }>(
        `/v1/audit-workspace/sources?search=${encodeURIComponent(query)}&offset=${offset}`,
        org,
      );
      if (res.error || !res.data) throw new Error(res.error || 'Unable to find evidence.');
      return res.data;
    },
  );
  const data = pages?.flatMap((page) => page.sources);
  const hasMore = pages?.at(-1)?.nextOffset != null;
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
      <DialogContent data-audit-live-surface size="3xl">
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
          {hasMore && (
            <Button
              variant="outline"
              disabled={!!saving || isValidating}
              loading={isValidating}
              onClick={() => void setSize((size) => size + 1)}
            >
              Load more evidence sources
            </Button>
          )}
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
