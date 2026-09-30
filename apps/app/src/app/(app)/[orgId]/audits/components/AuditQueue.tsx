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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@trycompai/design-system';
import { ArrowRight, Document, Grid, List } from '@trycompai/design-system/icons';
import { useState } from 'react';
import { CHECK_LABELS, checkStatus, type WorkspaceAudit } from '../workspace-types';
import { AuditAttention } from './AuditAttention';
import { AuditOverview } from './AuditOverview';
import { AuditReviewBoard } from './AuditReviewBoard';

export function AuditQueue({
  audit,
  layout,
  onLayoutChange,
  onSelect,
  onRequests,
  onReport,
  onEvidence,
}: {
  layout: 'list' | 'board';
  onLayoutChange: (layout: 'list' | 'board') => void;
  onRequests: () => void;
  onReport: () => void;
  onEvidence: () => void;
  audit: WorkspaceAudit;
  onSelect: (id: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<keyof typeof CHECK_LABELS | 'all' | 'no_evidence'>('all');
  const visible = audit.controls.filter(
    (c) =>
      (filter === 'all' ||
        (filter === 'no_evidence' ? !c.evidenceLinks.length : checkStatus(c) === filter)) &&
      `${c.controlRef} ${c.whatWasTested}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="space-y-6">
      <AuditOverview
        audit={audit}
        onSelect={onSelect}
        onRequests={onRequests}
        onReport={onReport}
        onEvidence={onEvidence}
      />
      <div
        className={`grid items-start gap-6 ${layout === 'list' ? 'xl:grid-cols-[minmax(0,1fr)_300px]' : ''}`}
      >
        <section className="min-w-0 space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold tracking-tight">Your review plan</h2>
            <span className="text-xs text-muted-foreground">
              {visible.length} of {audit.controls.length} checks
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2" aria-label="Quick check filters">
              {(['all', 'ready', 'waiting', 'no_evidence'] as const).map((key) => (
                <Button
                  key={key}
                  size="sm"
                  variant={filter === key ? 'default' : 'outline'}
                  aria-pressed={filter === key}
                  onClick={() => setFilter(key)}
                >
                  {key === 'all'
                    ? 'All checks'
                    : key === 'no_evidence'
                      ? 'No linked evidence'
                      : CHECK_LABELS[key]}
                  <span className="ml-1 opacity-70">
                    {key === 'all'
                      ? audit.controls.length
                      : audit.controls.filter((c) =>
                          key === 'no_evidence' ? !c.evidenceLinks.length : checkStatus(c) === key,
                        ).length}
                  </span>
                </Button>
              ))}
            </div>
            <div
              className="flex gap-1 rounded-lg border bg-muted/20 p-1"
              aria-label="Review plan layout"
            >
              <Button
                size="sm"
                variant={layout === 'board' ? 'secondary' : 'ghost'}
                aria-pressed={layout === 'board'}
                iconLeft={<Grid size={16} />}
                onClick={() => onLayoutChange('board')}
              >
                Board
              </Button>
              <Button
                size="sm"
                variant={layout === 'list' ? 'secondary' : 'ghost'}
                aria-pressed={layout === 'list'}
                iconLeft={<List size={16} />}
                onClick={() => onLayoutChange('list')}
              >
                List
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="min-w-48 flex-1">
              <Input
                aria-label="Search audit checks"
                placeholder="Find a check, criterion or keyword…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-52">
              <Select
                value={filter}
                onValueChange={(v) =>
                  setFilter((v ?? 'all') as keyof typeof CHECK_LABELS | 'all' | 'no_evidence')
                }
              >
                <SelectTrigger aria-label="Filter checks">
                  <SelectValue>
                    {filter === 'all'
                      ? 'All checks'
                      : filter === 'no_evidence'
                        ? 'No linked evidence'
                        : CHECK_LABELS[filter]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All checks</SelectItem>
                  <SelectItem value="no_evidence">No linked evidence</SelectItem>
                  {Object.entries(CHECK_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {layout === 'board' ? (
            <AuditReviewBoard checks={visible} onSelect={onSelect} />
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Audit check</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Evidence</TableHead>
                    <TableHead>
                      <span className="sr-only">Open</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <Button variant="link" onClick={() => onSelect(c.id)}>
                          {c.controlRef}
                        </Button>
                        <p className="mt-1 line-clamp-2 max-w-xl text-xs leading-5 text-muted-foreground">
                          {c.whatWasTested}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant={checkStatus(c) === 'reviewed' ? 'default' : 'secondary'}>
                          {CHECK_LABELS[checkStatus(c)]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Document size={16} />
                          {c.evidenceLinks.length}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Review ${c.controlRef}`}
                          iconLeft={<ArrowRight size={16} />}
                          onClick={() => onSelect(c.id)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {!visible.length && (
                    <TableRow>
                      <TableCell colSpan={4}>
                        <div className="p-8 text-center text-muted-foreground">
                          <p className="mb-3 text-sm">No checks match this view.</p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSearch('');
                              setFilter('all');
                            }}
                          >
                            Clear filters
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
        <AuditAttention
          horizontal={layout === 'board'}
          audit={audit}
          onSelect={onSelect}
          onRequests={onRequests}
          onReport={onReport}
        />
      </div>
    </div>
  );
}
