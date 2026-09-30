import { Button, Skeleton } from '@trycompai/design-system';
import { DocumentTasks, Renew } from '@trycompai/design-system/icons';
import Link from 'next/link';
export function AuditWorkspaceState({
  loading,
  error,
  empty,
  registerUrl,
  onRetry,
}: {
  loading: boolean;
  error: boolean;
  empty: boolean;
  registerUrl: string;
  onRetry: () => void;
}) {
  return (
    <>
      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/20 p-5"
        >
          <div>
            <p className="text-sm font-medium">We couldn't refresh this workspace.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Try again to load the latest audit data.
            </p>
          </div>
          <Button variant="outline" size="sm" iconLeft={<Renew size={16} />} onClick={onRetry}>
            Try again
          </Button>
        </div>
      )}
      {loading && (
        <div role="status" aria-label="Loading audit workspace" className="space-y-5">
          <Skeleton style={{ height: 220, width: '100%' }} />
          <Skeleton style={{ height: 280, width: '100%' }} />
          <span className="sr-only">Loading your audit workspace…</span>
        </div>
      )}
      {empty && (
        <section className="flex flex-col items-center rounded-xl border bg-gradient-to-b from-primary/5 to-background px-6 py-16 text-center">
          <div className="mb-5 rounded-xl border bg-background p-4 text-primary">
            <DocumentTasks size={28} />
          </div>
          <h2 className="text-xl font-semibold tracking-tight">
            A good audit starts with a clear plan.
          </h2>
          <p className="mb-6 mt-3 max-w-md text-sm leading-6 text-muted-foreground">
            Create an internal audit and its checks in the audit programme. This workspace will
            bring the evidence, conversations and conclusions together.
          </p>
          <Button render={<Link href={registerUrl} target="_blank" rel="noopener noreferrer" />}>
            Open audit programme
          </Button>
        </section>
      )}
    </>
  );
}
