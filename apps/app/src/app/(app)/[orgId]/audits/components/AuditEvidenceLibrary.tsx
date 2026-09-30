'use client';
import {
  Badge,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@trycompai/design-system';
import { ArrowRight, Compare, Copy, Document, Download } from '@trycompai/design-system/icons';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  buildEvidenceIndex,
  comparableEvidence,
  evidenceCitation,
  evidenceEntries,
  SOURCE_LABELS,
} from '../audit-evidence';
import { formatAuditDate, type WorkspaceAudit } from '../workspace-types';
import { AuditEvidenceCompare } from './AuditEvidenceCompare';
import { EvidenceSnapshot } from './EvidenceSnapshot';
export function AuditEvidenceLibrary({
  audit,
  organizationId,
  previewId,
  compareId,
  onPreview,
  onSelect,
  locked,
}: {
  audit: WorkspaceAudit;
  organizationId: string;
  previewId: string | null;
  compareId: string | null;
  onPreview: (id: string | null, compareId?: string | null) => void;
  onSelect: (id: string) => void;
  locked: boolean;
}) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const entries = evidenceEntries(audit);
  const filtered = entries.filter(
    ({ evidence: e, check }) =>
      (type === 'all' || e.sourceType === type) &&
      `${e.title} ${e.versionLabel} ${check.controlRef}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const preview = entries.find((e) => e.evidence.id === previewId);
  const comparison =
    preview &&
    comparableEvidence({ entry: preview, entries }).find((e) => e.evidence.id === compareId);
  const covered = audit.controls.filter((c) => c.evidenceLinks.length).length;
  const handleExport = () => {
    const url = URL.createObjectURL(
      new Blob([buildEvidenceIndex(audit)], { type: 'text/csv;charset=utf-8' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `${audit.reference.replace(/[^a-zA-Z0-9_-]/g, '-')}-evidence-index.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-widest text-primary">
            Evidence library
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">Every source. In context.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Find the version used in your review, trace it to a check, and compare retained text
            without losing your place.
          </p>
        </div>
        <Button
          variant="outline"
          iconLeft={<Download size={16} />}
          onClick={handleExport}
          disabled={!entries.length}
        >
          Export evidence index
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          [String(entries.length), 'Evidence references', 'Every link retains its check context'],
          [
            `${covered} / ${audit.controls.length}`,
            'Checks with linked evidence',
            'Coverage of links, not a compliance score',
          ],
          [
            String(new Set(entries.map(({ evidence: e }) => `${e.sourceType}:${e.sourceId}`)).size),
            'Distinct sources',
            'Documents, policies and files',
          ],
        ].map(([value, title, detail]) => (
          <div key={title} className="rounded-xl border bg-muted/15 p-5">
            <p className="text-2xl font-semibold tabular-nums">{value}</p>
            <h3 className="mt-1 text-sm font-medium">{title}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="min-w-56 flex-1">
          <Input
            aria-label="Search evidence library"
            placeholder="Search by title, version or check…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="w-48">
          <Select value={type} onValueChange={(value) => setType(value ?? 'all')}>
            <SelectTrigger aria-label="Evidence type">
              <SelectValue>
                {type === 'all' ? 'All sources' : SOURCE_LABELS[type as keyof typeof SOURCE_LABELS]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              {Object.entries(SOURCE_LABELS).map(([key, title]) => (
                <SelectItem key={key} value={key}>
                  {title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {filtered.map((entry) => {
          const { evidence: e, check } = entry;
          const comparisons = comparableEvidence({ entry, entries });
          return (
            <article
              key={e.id}
              className="flex flex-col rounded-xl border bg-background shadow-sm transition-colors hover:border-primary/30"
            >
              <div className="flex flex-1 items-start gap-4 p-5">
                <div className="rounded-xl border bg-primary/5 p-3 text-primary">
                  <Document size={23} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{SOURCE_LABELS[e.sourceType]}</Badge>
                    <span className="text-xs text-muted-foreground">{e.versionLabel}</span>
                  </div>
                  <h3 className="break-words text-base font-semibold">{e.title}</h3>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    Captured {formatAuditDate(e.createdAt)} · {e.capturedBy}
                  </p>
                  <div className="mt-3">
                    <Button
                      size="sm"
                      variant="link"
                      disabled={locked}
                      onClick={() => onSelect(check.id)}
                      iconRight={<ArrowRight size={14} />}
                    >
                      {check.controlRef}
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 border-t bg-muted/10 px-5 py-3">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={locked}
                  onClick={() => onPreview(e.id)}
                >
                  Read evidence
                </Button>
                {!!comparisons.length && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={locked}
                    iconLeft={<Compare size={16} />}
                    onClick={() => onPreview(e.id, comparisons[0].evidence.id)}
                  >
                    Compare versions
                  </Button>
                )}
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Copy citation for ${e.title}`}
                  iconLeft={<Copy size={16} />}
                  onClick={() => {
                    void navigator.clipboard.writeText(evidenceCitation(e)).then(
                      () => toast.success('Evidence reference copied'),
                      () => toast.error('Unable to copy the reference.'),
                    );
                  }}
                />
              </div>
            </article>
          );
        })}
      </div>
      {!filtered.length && (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <h3 className="text-base font-medium">
            {entries.length ? 'No matching evidence' : 'Build your evidence trail'}
          </h3>
          <p className="mx-auto mb-5 mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            {entries.length
              ? 'Try a different title, version or source type.'
              : 'Link records from a check to keep the source, captured version and review together.'}
          </p>
          {!!entries.length && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setQuery('');
                setType('all');
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      )}
      {preview &&
        (comparison ? (
          <AuditEvidenceCompare
            alternatives={comparableEvidence({ entry: preview, entries }).map((e) => e.evidence)}
            onSecondChange={(id) => onPreview(preview.evidence.id, id)}
            locked={locked}
            first={preview.evidence}
            second={comparison.evidence}
            onClose={() => onPreview(null)}
          />
        ) : (
          <EvidenceSnapshot
            organizationId={organizationId}
            evidence={preview.evidence}
            onClose={() => onPreview(null)}
          />
        ))}
    </div>
  );
}
