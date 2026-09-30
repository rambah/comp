import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@trycompai/design-system';
import { Close } from '@trycompai/design-system/icons';
import { snapshotText } from '../snapshot-text';
import { formatAuditDate, type EvidenceLink } from '../workspace-types';
import { AuditDocumentReader } from './AuditDocumentReader';
export function AuditEvidenceCompare({
  first,
  second,
  onClose,
  alternatives,
  onSecondChange,
  locked,
}: {
  first: EvidenceLink;
  second: EvidenceLink;
  onClose: () => void;
  alternatives: EvidenceLink[];
  onSecondChange: (id: string) => void;
  locked: boolean;
}) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        style={{
          width: 'calc(100vw - 3rem)',
          maxWidth: 1560,
          maxHeight: '92dvh',
          overflowY: 'auto',
        }}
        data-audit-live-target="evidence-comparison"
      >
        <div className="flex items-start justify-between gap-4">
          <DialogHeader>
            <DialogTitle>Compare captured versions</DialogTitle>
            <DialogDescription>
              {first.title} · Read the retained text side by side. Each pane has its own search.
            </DialogDescription>
          </DialogHeader>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Close version comparison"
            onClick={onClose}
            iconLeft={<Close size={18} />}
          />
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          {[first, second].map((evidence, index) => (
            <section
              key={evidence.id}
              aria-label={`Version ${index + 1}: ${evidence.versionLabel}`}
              className="min-w-0 overflow-hidden rounded-xl border"
            >
              <div className="space-y-1 border-b bg-muted/30 px-5 py-4">
                {index === 0 ? (
                  <h3 className="flex min-h-8 items-center text-sm font-semibold">
                    {evidence.versionLabel}
                  </h3>
                ) : (
                  <Select
                    value={second.id}
                    disabled={locked}
                    onValueChange={(id) => {
                      if (id) onSecondChange(id);
                    }}
                  >
                    <SelectTrigger aria-label="Comparison version">
                      <SelectValue>{evidence.versionLabel}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {alternatives.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.versionLabel} · {formatAuditDate(e.createdAt)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <p className="text-xs text-muted-foreground">
                  Captured {formatAuditDate(evidence.createdAt)} · {evidence.capturedBy}
                </p>
              </div>
              <div
                className="max-h-[62dvh] overflow-y-auto p-4"
                data-audit-live-target={`compare-${index}`}
              >
                <AuditDocumentReader text={snapshotText(evidence.snapshot.content)} />
              </div>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
