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
import { Download } from '@trycompai/design-system/icons';
import { snapshotText } from '../snapshot-text';
import type { EvidenceLink } from '../workspace-types';
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
        data-audit-live-target="evidence-preview"
        style={{
          width: 'calc(100vw - 3rem)',
          maxWidth: '1200px',
          maxHeight: '90dvh',
          overflowY: 'auto',
        }}
      >
        <DialogHeader>
          <DialogTitle>{evidence.title}</DialogTitle>
          <DialogDescription>
            {evidence.versionLabel} · Captured {new Date(evidence.createdAt).toLocaleString()} by{' '}
            {evidence.capturedBy}
          </DialogDescription>
        </DialogHeader>
        {!!evidence.snapshot.pdfOnly && (
          <AuditPdfPreview
            evidenceId={evidence.id}
            organizationId={organizationId}
            title={evidence.title}
          />
        )}
        {!evidence.snapshot.pdfOnly && (
          <>
            <div>
              <Button
                size="sm"
                variant="outline"
                iconLeft={<Download size={16} />}
                onClick={handleDownload}
              >
                Download captured text
              </Button>
            </div>
            <article className="mx-auto w-full max-w-3xl whitespace-pre-wrap break-words py-6 text-sm leading-7">
              {text ||
                (evidence.snapshot.pdfOnly
                  ? 'This policy was published as a PDF. Link its original evidence file to preview the PDF here.'
                  : 'This published version has no text snapshot. Open the source document to inspect its retained export.')}
            </article>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
