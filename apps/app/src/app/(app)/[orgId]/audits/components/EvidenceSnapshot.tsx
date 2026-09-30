'use client';
import { AttachmentPreviewDialog } from '@/components/attachments/AttachmentPreviewDialog';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@trycompai/design-system';
import { Close, Copy, Download } from '@trycompai/design-system/icons';
import { toast } from 'sonner';
import { evidenceCitation } from '../audit-evidence';
import { snapshotText } from '../snapshot-text';
import type { EvidenceLink } from '../workspace-types';
import { formatAuditDateTime } from '../workspace-types';
import { AuditDocumentReader } from './AuditDocumentReader';
import { AuditPdfPreview } from './AuditPdfPreview';

export function EvidenceSnapshot({
  evidence,
  organizationId,
  onClose,
}: {
  evidence: EvidenceLink;
  organizationId: string;
  onClose: () => void;
}) {
  if (evidence.sourceType === 'attachment')
    return (
      <AttachmentPreviewDialog
        attachment={{ id: evidence.sourceId, name: evidence.title }}
        onClose={onClose}
      />
    );
  const text = snapshotText(evidence.snapshot.content);
  const handleDownload = () => {
    const url = URL.createObjectURL(
      new Blob([`${evidence.title}\n${evidence.versionLabel}\n\n${text}`], {
        type: 'text/plain;charset=utf-8',
      }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `${evidence.title.replace(/[^a-zA-Z0-9 -]/g, '')}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        data-audit-live-surface
        showCloseButton={false}
        data-audit-live-target="evidence-preview"
        style={{
          width: 'calc(100vw - 3rem)',
          maxWidth: '1200px',
          maxHeight: '90dvh',
          overflowY: 'auto',
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <DialogHeader>
            <DialogTitle>{evidence.title}</DialogTitle>
            <DialogDescription>
              {evidence.versionLabel} · Captured {formatAuditDateTime(evidence.createdAt)} by{' '}
              {evidence.capturedBy}
            </DialogDescription>
          </DialogHeader>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Close evidence preview"
            onClick={onClose}
            iconLeft={<Close size={18} />}
          />
        </div>
        {!!evidence.snapshot.pdfOnly && (
          <AuditPdfPreview
            evidenceId={evidence.id}
            organizationId={organizationId}
            title={evidence.title}
          />
        )}
        {!evidence.snapshot.pdfOnly && (
          <>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                iconLeft={<Download size={16} />}
                onClick={handleDownload}
              >
                Download captured text
              </Button>
              <Button
                size="sm"
                variant="ghost"
                iconLeft={<Copy size={16} />}
                onClick={() => {
                  void navigator.clipboard.writeText(evidenceCitation(evidence)).then(
                    () => toast.success('Evidence reference copied'),
                    () => toast.error('Unable to copy the reference.'),
                  );
                }}
              >
                Copy citation
              </Button>
            </div>
            <AuditDocumentReader
              text={
                text ||
                'This published version has no text snapshot. Open the source document to inspect its retained export.'
              }
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
