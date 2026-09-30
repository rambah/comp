/** Swatch + label; shared by read-only display and select items (policy table pattern). */
export function ApplicableSwatchRow({ isApplicable }: { isApplicable: boolean | null }) {
  const swatchClass =
    isApplicable === true
      ? 'bg-primary'
      : isApplicable === false
        ? 'bg-red-600 dark:bg-red-400'
        : 'bg-gray-400 dark:bg-gray-500';
  const label = isApplicable === true ? 'Yes' : isApplicable === false ? 'No' : 'Not decided';

  return (
    <span className="flex items-center gap-2 text-sm text-foreground">
      <span className={`size-2 shrink-0 rounded-full ${swatchClass}`} aria-hidden />
      <span>{label}</span>
    </span>
  );
}

export function ApplicableReadOnlyDisplay({ isApplicable }: { isApplicable: boolean | null }) {
  return (
    <div className="inline-flex items-center">
      <ApplicableSwatchRow isApplicable={isApplicable} />
    </div>
  );
}
