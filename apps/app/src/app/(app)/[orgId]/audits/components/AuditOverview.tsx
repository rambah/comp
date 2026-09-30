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
      ? 'New responses. Ready to review.'
      : insight.next
        ? 'Continue your audit review.'
        : insight.remaining
          ? 'Waiting for your team’s response.'
          : audit.controls.length
            ? 'Ready for your overall conclusion.'
            : 'Start with a clear review plan.';
  const description = finished
    ? 'Revisit your completed checks, evidence and conclusions.'
    : insight.responses.length
      ? `${insight.responses.length} ${insight.responses.length === 1 ? 'response is' : 'responses are'} ready to review. Start with ${insight.next?.controlRef ?? 'your evidence inbox'}.`
      : insight.next
        ? insight.next.whatWasTested
        : insight.remaining
          ? 'Track outstanding requests while your team gathers the evidence.'
          : audit.controls.length
            ? 'Bring your observations together and prepare your overall conclusion.'
            : 'Add your checks in the audit programme to begin reviewing.';
  const handleContinue = () => {
    if (finished) return onReport();
    if (insight.next) return onSelect(insight.next.id);
    if (insight.remaining) return onRequests();
    onReport();
  };
  const metrics = [
    {
      label: 'Ready to review',
      value: insight.ready,
      icon: Checkmark,
      action: () => (insight.next ? onSelect(insight.next.id) : onReport()),
      detail: 'Continue your checks',
    },
    {
      label: 'Evidence references',
      value: insight.evidence,
      icon: Document,
      action: onEvidence,
      detail: 'Explore your library',
    },
    {
      label: 'Responses received',
      value: insight.responses.length,
      icon: Chat,
      action: onRequests,
      detail: 'Open your evidence inbox',
    },
    {
      label: 'Awaiting a response',
      value: insight.waiting,
      icon: Time,
      action: onRequests,
      detail: 'Follow up with your team',
    },
  ];
  return (
    <section aria-label="Audit overview" className="space-y-4">
      <div className="audit-surface overflow-hidden">
        <div className="grid md:grid-cols-3">
          <div className="audit-focus-card relative overflow-hidden p-6 sm:p-8 md:col-span-2">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-16 -top-24 h-80 w-80 rounded-full border border-primary/5"
            />
            <div className="relative space-y-5">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-background/70 px-3 py-1.5 text-xs font-medium text-primary">
                <ArrowRight size={14} />
                {finished ? 'Audit completed' : 'Your next step'}
              </span>
              <div className="space-y-2.5">
                <h2 className="max-w-xl text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
                  {title}
                </h2>
                <p className="max-w-xl text-sm leading-6 text-muted-foreground">{description}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button iconRight={<ArrowRight size={16} />} onClick={handleContinue}>
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
                <Button variant="ghost" iconLeft={<Document size={16} />} onClick={onEvidence}>
                  Browse evidence
                </Button>
              </div>
            </div>
          </div>
          <div className="border-t md:border-l md:border-t-0">
            <AuditProgressRing
              progress={insight.progress}
              reviewed={insight.reviewed}
              total={audit.controls.length}
              excluded={insight.excluded}
            />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {metrics.map(({ label, value, icon: Icon, action, detail }) => (
          <button
            key={label}
            type="button"
            onClick={action}
            aria-label={`${label}: ${value}. ${detail}`}
            className="audit-card group min-w-0 p-4 text-left sm:p-5"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
              <span className="rounded-lg bg-primary/5 p-2 text-primary">
                <Icon size={18} />
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              <ArrowRight
                size={16}
                className="text-muted-foreground/50 transition-colors group-hover:text-primary"
              />
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
