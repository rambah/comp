'use client';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@trycompai/design-system';
import { useState } from 'react';
import type { useAuditSharing } from './useAuditSharing';

export function AuditSharingNotice({
  sharing,
  connected,
  viewers,
  error,
}: {
  sharing: ReturnType<typeof useAuditSharing>;
  connected: boolean;
  viewers: string[];
  error: string | null;
}) {
  const [open, setOpen] = useState(false);
  const handleStart = async () => {
    if (await sharing.start()) setOpen(false);
  };
  return (
    <div
      data-audit-live-private
      className="audit-surface flex flex-wrap items-center justify-between gap-4 p-4"
    >
      <div className="space-y-1">
        <p className="text-sm font-medium">
          {sharing.session ? 'Live workspace sharing is on' : 'Live workspace sharing is off'}
        </p>
        <p className="text-xs text-muted-foreground" role="status">
          {sharing.session
            ? !connected
              ? 'Connecting… Your workspace remains usable.'
              : viewers.length
                ? `Watching: ${viewers.join(', ')}`
                : 'Ready for an authorized administrator to join.'
            : 'You decide when administrators can follow your view and unsaved inputs.'}
        </p>
        {(sharing.error || error) && (
          <p role="alert" className="text-sm text-destructive">
            {sharing.error || error}
          </p>
        )}
      </div>
      {sharing.session ? (
        <Button variant="outline" onClick={sharing.stop}>
          Stop sharing
        </Button>
      ) : (
        <Button variant="outline" onClick={() => setOpen(true)}>
          Share workspace live
        </Button>
      )}
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!sharing.starting) setOpen(value);
        }}
      >
        <DialogContent showCloseButton={!sharing.starting}>
          <DialogHeader>
            <DialogTitle>Share your audit workspace live?</DialogTitle>
            <DialogDescription>
              Authorized administrators in this organization will be able to see this workspace,
              open dialogs, your pointer, scrolling and text as you type, including unsaved notes,
              requests and Research AI questions. PDFs you open will open in their view too.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This reconstructs the audit workspace only. It does not share your screen, other tabs,
            desktop or password fields. Live events are not saved for later playback. You can stop
            at any time; leaving this workspace ends sharing.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" disabled={sharing.starting} onClick={() => setOpen(false)}>
              Keep private
            </Button>
            <Button loading={sharing.starting} onClick={handleStart}>
              Agree and share live
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
