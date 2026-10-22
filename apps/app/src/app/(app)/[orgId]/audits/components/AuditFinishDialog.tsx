'use client';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@trycompai/design-system';
import { useState } from 'react';
import type { WorkspaceAudit, WorkspaceMutation } from '../workspace-types';
export function AuditFinishDialog({
  audit,
  update,
  disabled,
}: {
  audit: WorkspaceAudit;
  update: WorkspaceMutation;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const handleFinish = async () => {
    setSaving(true);
    try {
      await update({
        path: `audits/${audit.id}/finish`,
        body: { expectedUpdatedAt: audit.updatedAt, confirmed: true },
      });
      setOpen(false);
    } catch {
      /* Keep the confirmation open; the mutation shows the validation error. */
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      <Button disabled={disabled} onClick={() => setOpen(true)}>
        Complete audit
      </Button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!saving) setOpen(value);
        }}
      >
        <DialogContent data-audit-live-surface size="lg" showCloseButton={!saving}>
          <DialogHeader>
            <DialogTitle>Complete {audit.reference}?</DialogTitle>
            <DialogDescription>
              I confirm that I have completed the planned sampling, reviewed the responses and
              recorded the overall conclusion. Comp will record my own name and today’s date as the
              auditor’s sign-off. Management approval and publication remain separate.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={saving} onClick={() => setOpen(false)}>
              Continue reviewing
            </Button>
            <Button loading={saving} onClick={() => void handleFinish()}>
              Confirm audit completion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
