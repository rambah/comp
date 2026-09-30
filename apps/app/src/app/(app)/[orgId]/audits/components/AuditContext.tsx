'use client';
import {
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@trycompai/design-system';
import { Calendar, DocumentTasks } from '@trycompai/design-system/icons';
import { formatAuditDate, type WorkspaceAudit } from '../workspace-types';

export function AuditContext({
  audit,
  audits,
  locked,
  canEdit,
  onChange,
}: {
  audit: WorkspaceAudit;
  audits: WorkspaceAudit[];
  locked: boolean;
  canEdit: boolean;
  onChange: (id: string) => void;
}) {
  const name = audit.auditorName || 'Auditor not assigned';
  const initials =
    audit.auditorName
      ?.split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('') || '—';
  return (
    <section
      aria-label="Current audit"
      className="audit-surface flex flex-wrap items-center justify-between gap-5 p-4 sm:px-6 sm:py-5"
    >
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <div className="hidden rounded-xl bg-primary/5 p-3 text-primary sm:block">
          <DocumentTasks size={24} />
        </div>
        <div className="min-w-0 space-y-2">
          <p className="audit-eyebrow">Current audit</p>
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-44 max-w-full">
              <Select value={audit.id} disabled={locked} onValueChange={(v) => v && onChange(v)}>
                <SelectTrigger aria-label="Select audit">
                  <SelectValue>{audit.reference}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {audits.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.reference}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
              {audit.status === 'complete'
                ? 'Completed'
                : audit.status === 'in_progress'
                  ? 'In progress'
                  : audit.status.replaceAll('_', ' ')}
            </span>
            {!canEdit && <Badge variant="outline">Read-only</Badge>}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-5 sm:gap-8">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-muted/60 text-xs font-semibold"
          >
            {initials}
          </span>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Lead auditor</p>
            <p className="mt-1 max-w-48 truncate text-sm font-medium" title={name}>
              {name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <Calendar size={18} className="text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Audit period</p>
            <p className="mt-1 text-sm font-medium">
              {formatAuditDate(audit.plannedStartDate)} – {formatAuditDate(audit.plannedEndDate)}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
