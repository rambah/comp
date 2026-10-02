export function AuditProgressRing({
  progress,
  reviewed,
  total,
  excluded,
}: {
  progress: number;
  reviewed: number;
  total: number;
  excluded: number;
}) {
  const length = 2 * Math.PI * 54;
  return (
    <div className="flex items-center justify-center gap-5 p-5 sm:p-6 md:flex-col md:gap-2.5">
      <div
        className="relative h-28 w-28 shrink-0 md:h-32 md:w-32"
        role="progressbar"
        aria-label="Checks with a recorded outcome"
        aria-valuenow={reviewed + excluded}
        aria-valuemin={0}
        aria-valuemax={total || 1}
      >
        <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90" aria-hidden="true">
          <circle
            cx="64"
            cy="64"
            r="54"
            fill="none"
            stroke="currentColor"
            strokeWidth="7"
            className="text-muted"
          />
          <circle
            cx="64"
            cy="64"
            r="54"
            fill="none"
            stroke="currentColor"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={length}
            strokeDashoffset={length * (1 - progress / 100)}
            className="text-primary transition-[stroke-dashoffset] duration-500 motion-reduce:transition-none"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-semibold tracking-tight tabular-nums">
            {progress}
            <span className="text-lg">%</span>
          </span>
          <span className="mt-1 text-[10px] font-medium text-muted-foreground">
            Review progress
          </span>
        </div>
      </div>
      <div className="space-y-2 md:text-center">
        <p className="text-sm">
          <strong>{reviewed}</strong> reviewed{' '}
          <span className="text-muted-foreground">of {total} checks</span>
        </p>
        <p className="max-w-52 text-xs leading-5 text-muted-foreground">
          {excluded ? `${excluded} explicitly not sampled. ` : ''}Recorded outcomes, not a
          compliance score.
        </p>
      </div>
    </div>
  );
}
