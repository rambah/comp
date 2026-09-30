'use client';
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@trycompai/design-system';
import { ArrowLeft, ChevronLeft, ChevronRight } from '@trycompai/design-system/icons';
import { CHECK_LABELS, checkStatus, type WorkspaceAudit } from '../workspace-types';
export function AuditCheckNavigator({
  audit,
  selected,
  locked,
  onSelect,
  onBack,
}: {
  audit: WorkspaceAudit;
  selected: string;
  locked: boolean;
  onSelect: (id: string) => void;
  onBack: () => void;
}) {
  const index = audit.controls.findIndex((c) => c.id === selected);
  return (
    <nav
      aria-label="Check navigation"
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2"
    >
      <Button
        variant="ghost"
        size="sm"
        disabled={locked}
        iconLeft={<ArrowLeft size={16} />}
        onClick={onBack}
      >
        Review plan
      </Button>
      <div className="flex min-w-0 items-center gap-2">
        <span className="hidden text-xs tabular-nums text-muted-foreground sm:inline">
          {index + 1} / {audit.controls.length}
        </span>
        <div className="w-52 sm:w-64">
          <Select value={selected} disabled={locked} onValueChange={(v) => v && onSelect(v)}>
            <SelectTrigger aria-label="Jump to audit check">
              <SelectValue>{audit.controls[index]?.controlRef}</SelectValue>
            </SelectTrigger>
            <SelectContent data-audit-live-surface>
              {audit.controls.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.controlRef} · {CHECK_LABELS[checkStatus(c)]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Previous check"
          title="Previous check"
          disabled={locked || index <= 0}
          onClick={() => onSelect(audit.controls[index - 1].id)}
          iconLeft={<ChevronLeft size={16} />}
        />
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Next check"
          title="Next check"
          disabled={locked || index >= audit.controls.length - 1}
          onClick={() => onSelect(audit.controls[index + 1].id)}
          iconLeft={<ChevronRight size={16} />}
        />
      </div>
    </nav>
  );
}
