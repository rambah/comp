import { Button } from '@trycompai/design-system';
import { ArrowRight, Chat, Checkmark, Document } from '@trycompai/design-system/icons';
import { CHECK_LABELS, checkStatus, type AuditCheck, type CheckStatus } from '../workspace-types';
const lanes: { key: string; title: string; description: string; statuses: CheckStatus[] }[] = [
  {
    key: 'open',
    title: 'To start',
    description: 'Set up the sample and evidence',
    statuses: ['open'],
  },
  {
    key: 'ready',
    title: 'Ready to review',
    description: 'Evidence or answers are available',
    statuses: ['ready'],
  },
  {
    key: 'waiting',
    title: 'Waiting on the team',
    description: 'Keep questions moving',
    statuses: ['waiting'],
  },
  {
    key: 'done',
    title: 'Review recorded',
    description: 'Outcomes and exclusions',
    statuses: ['reviewed', 'not_sampled'],
  },
];
export function AuditReviewBoard({
  checks,
  onSelect,
}: {
  checks: AuditCheck[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4" aria-label="Review board">
      {lanes.map((lane) => {
        const items = checks.filter((c) => lane.statuses.includes(checkStatus(c)));
        return (
          <section
            key={lane.key}
            aria-label={lane.title}
            className="min-w-0 rounded-xl border bg-muted/25 p-3"
          >
            <div className="px-1 pb-4 pt-1">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">{lane.title}</h3>
                <span className="rounded-md border bg-background px-2 py-0.5 text-xs tabular-nums">
                  {items.length}
                </span>
              </div>
              <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{lane.description}</p>
            </div>
            <div className="space-y-3">
              {items.map((check) => (
                <article
                  key={check.id}
                  className="rounded-lg border bg-background p-4 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="mb-3 flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-primary">
                    {lane.key === 'done' && <Checkmark size={14} />}
                    {CHECK_LABELS[checkStatus(check)]}
                  </div>
                  <h4 className="text-sm font-semibold leading-6">{check.controlRef}</h4>
                  <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground">
                    {check.whatWasTested}
                  </p>
                  <div className="mt-4 flex items-center justify-between border-t pt-3">
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1" title="Linked evidence">
                        <Document size={14} />
                        {check.evidenceLinks.length}
                      </span>
                      <span className="flex items-center gap-1" title="Open requests">
                        <Chat size={14} />
                        {check.requests.filter((r) => r.status !== 'accepted').length}
                      </span>
                    </div>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Review ${check.controlRef}`}
                      iconLeft={<ArrowRight size={16} />}
                      onClick={() => onSelect(check.id)}
                    />
                  </div>
                </article>
              ))}
              {!items.length && (
                <p className="rounded-lg border border-dashed px-3 py-8 text-center text-xs text-muted-foreground">
                  No checks here
                </p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
