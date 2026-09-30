'use client';
import { Button } from '@trycompai/design-system';
import { ArrowRight, CheckmarkOutline, Time } from '@trycompai/design-system/icons';
import { auditActivity, auditInsights } from '../audit-insights';
import { formatAuditDate, type WorkspaceAudit } from '../workspace-types';

export function AuditAttention({
  audit,
  onSelect,
  onRequests,
  onReport,
}: {
  audit: WorkspaceAudit;
  onSelect: (id: string) => void;
  onRequests: () => void;
  onReport: () => void;
}) {
  const info = auditInsights(audit);
  const activity = auditActivity(audit);
  return (
    <aside className="space-y-5">
      <section className="rounded-xl border bg-background p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Needs your attention</h3>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {info.responses.length + info.overdue.length}
          </span>
        </div>
        {info.responses.length > 0 && (
          <div className="mb-4 rounded-lg bg-primary/5 p-4">
            <p className="text-sm font-medium">
              {info.responses.length} response{info.responses.length !== 1 ? 's' : ''} to review
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Accept the evidence or ask for a clarification to move these checks forward.
            </p>
            <div className="mt-3">
              <Button
                size="sm"
                variant="outline"
                iconRight={<ArrowRight size={14} />}
                onClick={onRequests}
              >
                Review responses
              </Button>
            </div>
          </div>
        )}
        {info.overdue.slice(0, 3).map((r) => (
          <div key={r.id} className="border-b py-3 last:border-0">
            <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
              <Time size={14} />
              Overdue · {formatAuditDate(r.dueDate)}
            </div>
            <p className="line-clamp-2 text-sm">{r.question}</p>
            <Button size="sm" variant="link" onClick={() => onSelect(r.check.id)}>
              {r.check.controlRef}
            </Button>
          </div>
        ))}
        {!info.responses.length && !info.overdue.length && (
          <div className="space-y-2 py-3">
            <CheckmarkOutline size={24} className="text-primary" />
            <p className="text-sm font-medium">Nothing urgent here.</p>
            <p className="text-xs leading-5 text-muted-foreground">
              Continue your checks. New responses and overdue requests will appear here.
            </p>
          </div>
        )}
        {info.canComplete && (
          <div className="mt-3 border-t pt-4">
            <Button size="sm" variant="outline" onClick={onReport}>
              Review completion checklist
            </Button>
          </div>
        )}
      </section>
      <section className="rounded-xl border bg-background p-5">
        <h3 className="mb-4 text-sm font-semibold">Latest saved activity</h3>
        {activity.length ? (
          <ol className="space-y-4">
            {activity.map((item) => (
              <li key={item.id} className="relative border-l pl-4">
                <span className="absolute -left-1 top-1 h-2 w-2 rounded-full bg-primary/40" />
                <p className="text-xs leading-5 text-muted-foreground">{item.title}</p>
                <Button variant="link" size="sm" onClick={() => onSelect(item.checkId)}>
                  <span className="line-clamp-2 text-left">{item.detail}</span>
                </Button>
                <p className="mt-1 text-[11px] text-muted-foreground">{formatAuditDate(item.at)}</p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-xs leading-5 text-muted-foreground">
            Your saved reviews, linked evidence and request updates will appear as you work.
          </p>
        )}
      </section>
    </aside>
  );
}
