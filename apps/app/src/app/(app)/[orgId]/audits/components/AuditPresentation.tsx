import type { ReactNode } from 'react';
import { CHECK_LABELS, type CheckStatus } from '../workspace-types';

const statusStyles: Record<CheckStatus, string> = {
  open: 'bg-muted text-muted-foreground',
  ready: 'bg-primary/10 text-primary',
  waiting: 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
  reviewed: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
  not_sampled: 'bg-muted text-muted-foreground',
};

export function AuditCheckStatus({ status }: { status: CheckStatus }) {
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[status]}`}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
      {CHECK_LABELS[status]}
    </span>
  );
}

export function AuditSectionHeading({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 space-y-2">
        <p className="audit-eyebrow">{eyebrow}</p>
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function AuditMetric({
  value,
  label,
  detail,
  icon,
}: {
  value: ReactNode;
  label: string;
  detail?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="audit-surface flex items-start justify-between gap-3 p-5">
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
        {detail && <p className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</p>}
      </div>
      {icon && <span className="rounded-xl bg-primary/5 p-2.5 text-primary">{icon}</span>}
    </div>
  );
}

export function AuditEmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="audit-surface flex flex-col items-center px-5 py-12 text-center">
      <div className="mb-4 rounded-2xl border bg-muted/40 p-4 text-primary">{icon}</div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
