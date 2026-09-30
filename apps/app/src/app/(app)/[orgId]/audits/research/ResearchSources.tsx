'use client';
import { apiClient } from '@/lib/api-client';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@trycompai/design-system';
import { ArrowUpRight, Copy, Document, Time } from '@trycompai/design-system/icons';
import { toast } from 'sonner';
import useSWR from 'swr';
import { AuditDocumentReader } from '../components/AuditDocumentReader';
import { citationSchema, trustedSourceUrl, type ResearchCitation } from './research-types';
export function ResearchSources({
  sources,
  onSelect,
}: {
  sources: ResearchCitation[];
  onSelect: (source: ResearchCitation) => void;
}) {
  if (!sources.length) return null;
  return (
    <div className="mt-5 border-t pt-4">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Sources consulted · {sources.length}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {sources.map((source) => (
          <button
            key={source.label}
            type="button"
            onClick={() => onSelect(source)}
            className="group flex items-start gap-3 rounded-lg border bg-background p-3 text-left transition hover:border-primary/40 hover:bg-primary/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
              {source.label}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium">{source.title}</span>
              <span className="mt-1 block truncate text-[11px] text-muted-foreground">
                {source.version}
              </span>
            </span>
            <ArrowUpRight size={14} />
          </button>
        ))}
      </div>
    </div>
  );
}
export function ResearchSourceDialog({
  source: summary,
  organizationId,
  threadId,
  turnId,
  onClose,
}: {
  source: ResearchCitation | null;
  threadId: string | null;
  turnId: string | null;
  organizationId: string;
  onClose: () => void;
}) {
  const captured = useSWR(
    summary && threadId && turnId
      ? ['research-source', organizationId, threadId, turnId, summary.label]
      : null,
    async () => {
      const response = await apiClient.get(
        `/v1/audit-workspace/research/threads/${threadId}/turns/${turnId}/sources/${summary?.label}`,
        organizationId,
      );
      if (response.error) throw new Error(response.error);
      return citationSchema.parse(response.data);
    },
  );
  const source = captured.data ?? summary;
  const url = source && trustedSourceUrl({ url: source.url, organizationId });
  const handleCopy = async () => {
    if (!source) return;
    try {
      await navigator.clipboard.writeText(
        `${source.title} · ${source.version}\nRetrieved ${source.retrievedAt}\n\n${source.excerpt}`,
      );
      toast.success('Source excerpt copied');
    } catch {
      toast.error('Could not copy. Select the excerpt to copy it manually.');
    }
  };
  return (
    <Dialog
      open={!!source}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent size="4xl">
        <DialogHeader>
          <DialogTitle>{source?.title ?? 'Source'}</DialogTitle>
          <DialogDescription>
            Captured source excerpt from this answer. The original record may have changed since
            this research.
          </DialogDescription>
        </DialogHeader>
        {source && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{source.label}</Badge>
                <span className="text-xs text-muted-foreground">{source.version}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  iconLeft={<Copy size={14} />}
                  onClick={handleCopy}
                  disabled={!captured.data}
                >
                  Copy excerpt
                </Button>
                {url && (
                  <Button
                    variant="outline"
                    size="sm"
                    iconLeft={<Document size={14} />}
                    onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
                  >
                    Open in Comp
                  </Button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Time size={14} />
              Retrieved {new Date(source.retrievedAt).toLocaleString()} · character{' '}
              {source.offset + 1}
            </div>
            <div
              className="max-h-[65vh] overflow-y-auto p-1"
              data-audit-live-target="research-source"
            >
              {captured.error ? (
                <p role="alert">
                  Could not load the full captured excerpt. Please reopen this source to retry.
                </p>
              ) : captured.isLoading ? (
                <p>Loading captured excerpt…</p>
              ) : (
                <AuditDocumentReader text={source.excerpt} />
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
