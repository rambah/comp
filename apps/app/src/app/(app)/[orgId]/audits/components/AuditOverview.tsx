'use client';
import { Button } from '@trycompai/design-system';
import { ArrowRight, Chat, Checkmark, Document, Time } from '@trycompai/design-system/icons';
import { auditInsights } from '../audit-insights';
import type { WorkspaceAudit } from '../workspace-types';

export function AuditOverview({
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
  const insight = auditInsights(audit);
  const finished = audit.status === 'complete';
  const title = finished
    ? 'Your audit review is complete.'
    : insight.responses.length
      ? 'A fresh response is ready for you.'
      : insight.next
        ? insight.next.controlRef
        : insight.remaining
          ? 'Your questions are with the team.'
          : audit.controls.length
            ? 'Your review is ready to wrap up.'
            : 'Start with your review plan.';
  return (
    <section
      aria-label="Audit overview"
      className="overflow-hidden rounded-xl border bg-background shadow-sm"
    >
      <div className="grid lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-5 bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6 sm:p-8">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            {finished ? 'Audit completed' : 'Suggested next step'}
          </div>
          <div className="space-y-2">
            <h2 className="max-w-xl text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
            <p className="max-w-xl text-sm leading-6 text-muted-foreground">
              {finished
                ? 'Your completed checks, evidence and conclusions are ready to revisit.'
                : insight.next?.whatWasTested ||
                  (insight.remaining
                    ? 'Keep track of outstanding evidence requests while the team prepares its responses.'
                    : audit.controls.length
                      ? 'Bring your observations together and check what remains before sign-off.'
                      : 'Add the planned checks in Audit programme, then return here to start reviewing.')}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Button
              iconRight={<ArrowRight size={16} />}
              onClick={() =>
                insight.next && !finished
                  ? onSelect(insight.next.id)
                  : insight.remaining
                    ? onRequests()
                    : onReport()
              }
            >
              {finished
                ? 'Open audit record'
                : insight.responses.length
                  ? 'Review latest response'
                  : insight.next
                    ? 'Continue review'
                    : insight.remaining
                      ? 'View outstanding requests'
                      : 'Prepare your conclusion'}
            </Button>
            {insight.next && !finished && (
              <p className="max-w-sm truncate text-xs text-muted-foreground">
                Next: {insight.next.controlRef}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col justify-center gap-4 border-t p-6 sm:p-8 lg:border-l lg:border-t-0">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium">Review progress</span>
            <span className="text-3xl font-semibold tracking-tight tabular-nums">
              {insight.progress}
              <span className="text-base text-muted-foreground">%</span>
            </span>
          </div>
          <div
            role="progressbar"
            aria-label="Checks with a recorded outcome"
            aria-valuenow={insight.reviewed + insight.excluded}
            aria-valuemin={0}
            aria-valuemax={audit.controls.length || 1}
            className="flex h-2 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="bg-primary transition-[width] duration-300 motion-reduce:transition-none"
              style={{
                width: `${audit.controls.length ? (insight.reviewed / audit.controls.length) * 100 : 0}%`,
              }}
            />
            <div
              className="bg-primary/30"
              style={{
                width: `${audit.controls.length ? (insight.excluded / audit.controls.length) * 100 : 0}%`,
              }}
            />
          </div>
          <p className="text-sm">
            <strong>{insight.reviewed}</strong> reviewed{' '}
            <span className="text-muted-foreground">of {audit.controls.length} planned checks</span>
          </p>
          <p className="text-xs leading-5 text-muted-foreground">
            {insight.excluded ? `${insight.excluded} explicitly not sampled. ` : ''}This is audit
            progress, not a compliance score.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 divide-x border-t lg:grid-cols-4">
        {[
          { label: 'Ready to review', value: insight.ready, icon: Checkmark },
          { label: 'Evidence references', value: insight.evidence, icon: Document },
          { label: 'Responses received', value: insight.responses.length, icon: Chat },
          { label: 'Awaiting a response', value: insight.waiting, icon: Time },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="flex items-center gap-3 p-4 sm:px-6">
            <div className="rounded-lg bg-muted/60 p-2 text-primary">
              <Icon size={18} />
            </div>
            <div>
              <p className="text-xl font-semibold tabular-nums">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
