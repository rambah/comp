'use client';
import { Button } from '@trycompai/design-system';
import { ArrowRight, Chat, Checkmark, Document, Time } from '@trycompai/design-system/icons';
import { auditInsights } from '../audit-insights';
import type { WorkspaceAudit } from '../workspace-types';
import { AuditProgressRing } from './AuditProgressRing';

export function AuditOverview({
  audit,
  onSelect,
  onRequests,
  onReport,
  onEvidence,
}: {
  audit: WorkspaceAudit;
  onSelect: (id: string) => void;
  onRequests: () => void;
  onReport: () => void;
  onEvidence: () => void;
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
        <div className="relative space-y-6 bg-primary p-6 text-primary-foreground sm:p-9">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-primary-foreground/75">
            <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
            {finished ? 'Audit completed' : 'Suggested next step'}
          </div>
          <div className="space-y-2">
            <h2 className="max-w-2xl text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
              {title}
            </h2>
            <p className="max-w-xl text-sm leading-6 text-primary-foreground/80">
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
              variant="secondary"
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
            <Button variant="secondary" iconLeft={<Document size={16} />} onClick={onEvidence}>
              Browse evidence
            </Button>
          </div>
        </div>
        <AuditProgressRing
          progress={insight.progress}
          reviewed={insight.reviewed}
          total={audit.controls.length}
          excluded={insight.excluded}
        />
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
