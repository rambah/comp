import { ArrowRight, Chat, Document } from '@trycompai/design-system/icons';
import { checkStatus, type AuditCheck, type CheckStatus } from '../workspace-types';
import { AuditCheckStatus } from './AuditPresentation';
const lanes: {
  key: string;
  title: string;
  description: string;
  statuses: CheckStatus[];
  color: string;
}[] = [
  {
    key: 'open',
    title: 'To start',
    description: 'Choose your sample',
    statuses: ['open'],
    color: 'bg-muted-foreground/50',
  },
  {
    key: 'ready',
    title: 'Ready to review',
    description: 'Evidence is ready for you',
    statuses: ['ready'],
    color: 'bg-primary',
  },
  {
    key: 'waiting',
    title: 'Waiting on the team',
    description: 'Keep your questions moving',
    statuses: ['waiting'],
    color: 'bg-amber-500',
  },
  {
    key: 'done',
    title: 'Review recorded',
    description: 'Outcomes and exclusions',
    statuses: ['reviewed', 'not_sampled'],
    color: 'bg-emerald-600',
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
    <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="Review board">
      {lanes.map((lane) => {
        const items = checks.filter((c) => lane.statuses.includes(checkStatus(c)));
        return (
          <section
            key={lane.key}
            aria-label={lane.title}
            className="min-w-0 rounded-2xl bg-muted/60 p-3"
          >
            <div className="px-1 pb-4 pt-2">
              <div className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 shrink-0 rounded-full ${lane.color}`}
                />
                <h3 className="min-w-0 flex-1 text-sm font-semibold">{lane.title}</h3>
                <span className="rounded-md bg-background/80 px-2 py-0.5 text-xs font-medium tabular-nums">
                  {items.length}
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{lane.description}</p>
            </div>
            <div className="space-y-3">
              {items.map((check) => (
                <button
                  key={check.id}
                  type="button"
                  aria-label={`Review ${check.controlRef}`}
                  onClick={() => onSelect(check.id)}
                  className="audit-card group block w-full p-4 text-left"
                >
                  <AuditCheckStatus status={checkStatus(check)} />
                  <h4 className="mt-3 break-words text-sm font-semibold leading-6">
                    {check.controlRef}
                  </h4>
                  <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground">
                    {check.whatWasTested}
                  </p>
                  <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-3">
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span
                        className="flex items-center gap-1.5"
                        aria-label={`${check.evidenceLinks.length} linked evidence references`}
                      >
                        <Document size={14} />
                        {check.evidenceLinks.length}
                      </span>
                      <span
                        className="flex items-center gap-1.5"
                        aria-label={`${check.requests.filter((r) => r.status !== 'accepted').length} open requests`}
                      >
                        <Chat size={14} />
                        {check.requests.filter((r) => r.status !== 'accepted').length}
                      </span>
                    </div>
                    <span className="rounded-full bg-muted/50 p-1.5 text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                      <ArrowRight size={15} />
                    </span>
                  </div>
                </button>
              ))}
              {!items.length && (
                <div className="rounded-xl border border-dashed border-border/80 px-3 py-9 text-center">
                  <p className="text-xs text-muted-foreground">No checks here yet</p>
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
