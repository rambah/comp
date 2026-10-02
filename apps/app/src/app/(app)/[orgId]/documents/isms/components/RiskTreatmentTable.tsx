'use client';

import {
  Badge,
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Input,
  Text,
} from '@trycompai/design-system';
import { ChevronDown, ChevronUp } from '@trycompai/design-system/icons';
import { useId, useMemo, useState } from 'react';
import type { IsmsAcceptanceState } from '../isms-types';
import { IsmsMarkdown } from './shared/IsmsMarkdown';

/** The columns shared by the organisational and supplier risk tables. */
export interface RiskTreatmentTableRow {
  /** First cell: risk reference (R-01) or vendor name. */
  key: string;
  title: string;
  category: string;
  inherentLevel: string;
  treatment: string;
  controls: string;
  ownerName: string;
  residualLevel: string;
  acceptance: string;
  acceptanceState: IsmsAcceptanceState;
  status: string;
}

const ACCEPTANCE_BADGE: Record<
  IsmsAcceptanceState,
  { variant: 'accent' | 'secondary' | 'destructive'; label: string }
> = {
  accepted: { variant: 'accent', label: 'Accepted' },
  awaiting: { variant: 'secondary', label: 'Awaiting acceptance' },
  stale: { variant: 'destructive', label: 'Stale' },
};

interface RiskTreatmentTableProps {
  /** Header of the first column ("Ref" for risks, "Vendor" for suppliers). */
  keyHeader: string;
  /** Hide the description column for vendors (the key cell is the name). */
  showTitle: boolean;
  rows: RiskTreatmentTableRow[];
  emptyText: string;
}

export function RiskTreatmentTable({
  keyHeader,
  showTitle,
  rows,
  emptyText,
}: RiskTreatmentTableProps) {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const id = useId();
  const filtered = useMemo(
    () =>
      rows
        .map((row, index) => ({ row, index }))
        .filter(({ row }) =>
          [
            row.key,
            row.title,
            row.category,
            row.controls,
            row.ownerName,
            row.treatment,
            row.acceptance,
            row.status,
          ]
            .join(' ')
            .toLowerCase()
            .includes(query.trim().toLowerCase()),
        ),
    [rows, query],
  );
  if (!rows.length)
    return (
      <div className="rounded-md border py-8 text-center">
        <Text variant="muted">{emptyText}</Text>
      </div>
    );
  const allExpanded = filtered.length > 0 && filtered.every(({ index }) => expanded.has(index));
  const handleToggleAll = () =>
    setExpanded((current) => {
      const next = new Set(current);
      filtered.forEach(({ index }) => (allExpanded ? next.delete(index) : next.add(index)));
      return next;
    });
  const handleToggle = (index: number) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  return (
    <div className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-48 flex-1">
          <Input
            aria-label={`Search ${keyHeader === 'Vendor' ? 'supplier' : 'organisational'} risks`}
            placeholder="Search title, owner or treatment text…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <span className="text-xs text-muted-foreground" role="status">
          {filtered.length} of {rows.length} entries
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!filtered.length}
          onClick={handleToggleAll}
        >
          {allExpanded ? 'Collapse all' : 'Expand all'}
        </Button>
      </div>
      {!filtered.length && (
        <div className="rounded-md border p-6 text-center">
          <Text variant="muted">No matching entries. Try another title, owner or keyword.</Text>
          <Button type="button" size="sm" variant="ghost" onClick={() => setQuery('')}>
            Clear search
          </Button>
        </div>
      )}
      {filtered.map(({ row, index }) => {
        const badge = ACCEPTANCE_BADGE[row.acceptanceState];
        const open = expanded.has(index);
        const contentId = `${id}-${index}`;
        return (
          <Collapsible
            render={<article />}
            open={open}
            onOpenChange={() => handleToggle(index)}
            key={`${row.key}-${index}`}
            className="min-w-0 overflow-hidden rounded-lg border bg-card"
          >
            <div className="space-y-4 p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="break-words text-base font-semibold">
                    {showTitle ? row.title : row.key}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {showTitle ? `Export reference ${row.key} · ` : ''}
                    {row.category} · {row.status}
                  </p>
                </div>
                <Badge variant={badge.variant}>{badge.label}</Badge>
              </div>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 lg:grid-cols-4">
                <RiskFact label="Inherent risk" value={row.inherentLevel} />
                <RiskFact label="Current risk (residual)" value={row.residualLevel} />
                <RiskFact label="Treatment" value={row.treatment} />
                <RiskFact label="Owner" value={row.ownerName} />
              </dl>
              {row.acceptanceState !== 'awaiting' && <div className="text-xs text-muted-foreground">{row.acceptance}</div>}
              <CollapsibleTrigger
                aria-controls={contentId}
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    iconLeft={open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  />
                }
              >
                {open ? 'Hide treatment and evidence' : 'Read treatment and evidence'}
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent
              id={contentId}
              role="region"
              aria-label={`Treatment details: ${row.title}`}
              className="border-t bg-muted/20 p-4 sm:p-6"
            >
              <div className="max-w-prose">
                <h4 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Controls / actions
                </h4>
                <IsmsMarkdown>{row.controls || 'No treatment text recorded yet.'}</IsmsMarkdown>

              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}

function RiskFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium">{value || '—'}</dd>
    </div>
  );
}
