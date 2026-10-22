import { Button } from '@trycompai/design-system';

export function EvidenceSubmissionState({
  loading,
  error,
  empty,
  onRetry,
}: {
  loading: boolean;
  error: boolean;
  empty: boolean;
  onRetry: () => void;
}) {
  if (error)
    return (
      <div role="alert" className="space-y-3 rounded-md border p-4">
        <p>
          Unable to load all submissions. Access may be denied or the service may be temporarily
          unavailable. Any records shown below may be incomplete.
        </p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      </div>
    );
  if (loading)
    return (
      <p role="status" className="p-4 text-sm text-muted-foreground">
        Loading submissions…
      </p>
    );
  if (empty)
    return (
      <div className="rounded-md border p-6 text-center">
        <h3 className="font-medium">No submissions found</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          There are no submissions matching the current search.
        </p>
      </div>
    );
  return null;
}
