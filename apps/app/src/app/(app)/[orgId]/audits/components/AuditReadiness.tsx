import { Button } from '@trycompai/design-system';
import { ArrowRight, Checkmark } from '@trycompai/design-system/icons';
import { auditInsights } from '../audit-insights';
import type { WorkspaceAudit } from '../workspace-types';
export function AuditReadiness({
  audit,
  disabled,
  onChecks,
  onRequests,
}: {
  audit: WorkspaceAudit;
  disabled: boolean;
  onChecks: () => void;
  onRequests: () => void;
}) {
  const info = auditInsights(audit);
  const rows = [
    {
      title: 'Outcomes and reasoning recorded',
      detail: info.undocumented
        ? `${info.undocumented} checks still need an outcome or notes.`
        : `${audit.controls.length} planned checks accounted for.`,
      complete: audit.controls.length > 0 && !info.undocumented,
      action: onChecks,
    },
    {
      title: 'Sampling is documented',
      detail: info.reviewed
        ? `${info.reviewed} ${info.reviewed === 1 ? 'check' : 'checks'} reviewed.`
        : 'At least one check must be sampled.',
      complete: info.reviewed > 0,
      action: onChecks,
    },
    {
      title: 'Responses have been reviewed',
      detail: info.outstanding.length
        ? `${info.outstanding.length} requests still await acceptance.`
        : 'No outstanding evidence requests.',
      complete: !info.outstanding.length,
      action: onRequests,
    },
    {
      title: 'Overall conclusion saved',
      detail: 'Include your reasoning and any limitations.',
      complete: !!audit.conclusionVerdict && !!audit.conclusionNotes?.trim(),
      action: null,
    },
  ];
  return (
    <section className="rounded-xl border bg-background p-6">
      <div className="mb-5 flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold">Completion checklist</h3>
        <span className="text-xs text-muted-foreground">
          {rows.filter((r) => r.complete).length} / {rows.length}
        </span>
      </div>
      <ol className="space-y-5">
        {rows.map((r, i) => (
          <li key={r.title} className="flex items-start gap-3">
            <span
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${r.complete ? 'bg-primary/10 text-primary' : 'border text-muted-foreground'}`}
            >
              {r.complete ? <Checkmark size={15} /> : i + 1}
            </span>
            <div className="space-y-1">
              <p className="text-sm font-medium">{r.title}</p>
              <p className="text-xs leading-5 text-muted-foreground">{r.detail}</p>
              {!r.complete && r.action && (
                <Button
                  size="sm"
                  variant="link"
                  disabled={disabled}
                  onClick={r.action}
                  iconRight={<ArrowRight size={13} />}
                >
                  Open remaining work
                </Button>
              )}
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-6 border-t pt-4 text-xs leading-5 text-muted-foreground">
        Open findings may remain in the report. Management approval and publication happen
        separately.
      </p>
    </section>
  );
}
