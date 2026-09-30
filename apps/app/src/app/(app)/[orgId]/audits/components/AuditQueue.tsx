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
  Text,
} from '@trycompai/design-system';
import { ArrowRight, Document } from '@trycompai/design-system/icons';
import { useState } from 'react';
import { CHECK_LABELS, checkStatus, nextCheck, type WorkspaceAudit } from '../workspace-types';

export function AuditQueue({
  audit,
  onSelect,
}: {
  audit: WorkspaceAudit;
  onSelect: (id: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<keyof typeof CHECK_LABELS | 'all'>('all');
  const reviewed = audit.controls.filter((c) => checkStatus(c) === 'reviewed').length;
  const notSampled = audit.controls.filter((c) => checkStatus(c) === 'not_sampled').length;
  const next = nextCheck(audit);
  const visible = audit.controls.filter(
    (c) =>
      (filter === 'all' || checkStatus(c) === filter) &&
      `${c.controlRef} ${c.whatWasTested}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-muted/20 p-5">
        <div className="space-y-2">
          <Text weight="medium">
            {reviewed} of {audit.controls.length} checks reviewed
          </Text>
          <Text size="sm" variant="muted">
            {notSampled ? `${notSampled} not sampled. ` : ''}Progress reflects audit work, not a
            compliance score.
          </Text>
          <div
            className="h-1.5 w-56 max-w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-label="Checks with a recorded outcome"
            aria-valuenow={reviewed + notSampled}
            aria-valuemin={0}
            aria-valuemax={audit.controls.length || 1}
          >
            <div
              className="h-full bg-primary"
              style={{
                width: `${audit.controls.length ? ((reviewed + notSampled) / audit.controls.length) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
        {next && (
          <Button iconRight={<ArrowRight size={16} />} onClick={() => onSelect(next.id)}>
            Continue review
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="min-w-48 flex-1">
          <Input
            aria-label="Search audit checks"
            placeholder="Search checks or criteria…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-52">
          <Select
            value={filter}
            onValueChange={(v) => setFilter((v ?? 'all') as keyof typeof CHECK_LABELS | 'all')}
          >
            <SelectTrigger aria-label="Filter checks">
              <SelectValue>{filter === 'all' ? 'All checks' : CHECK_LABELS[filter]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All checks</SelectItem>
              {Object.entries(CHECK_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
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
                  <p className="max-w-xl text-sm text-muted-foreground">{c.whatWasTested}</p>
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
                    No checks match this view.
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
