'use client';
import {
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@trycompai/design-system';
import { Calendar, DocumentTasks, User } from '@trycompai/design-system/icons';
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
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-muted/15 px-5 py-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="hidden rounded-lg border bg-background p-2.5 text-primary sm:block">
          <DocumentTasks size={22} />
        </div>
        <div className="space-y-1.5">
          <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Internal audit programme
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-44">
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
            <Badge variant={audit.status === 'complete' ? 'default' : 'secondary'}>
              {audit.status.replaceAll('_', ' ')}
            </Badge>
            {!canEdit && <Badge variant="outline">Read-only</Badge>}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <User size={15} />
          {audit.auditorName || 'Auditor not assigned'}
        </span>
        <span className="flex items-center gap-2">
          <Calendar size={15} />
          {formatAuditDate(audit.plannedStartDate)} — {formatAuditDate(audit.plannedEndDate)}
        </span>
      </div>
    </div>
  );
}
