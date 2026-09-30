'use client';
import { apiClient } from '@/lib/api-client';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Text,
} from '@trycompai/design-system';
import { useState } from 'react';

export interface SharingChoice {
  allowed: boolean;
  nonce: string;
}
export function AuditSharingConsent({
  organizationId,
  open,
  onChoice,
  onPause,
}: {
  organizationId: string;
  open: boolean;
  onChoice: (choice: SharingChoice) => void;
  onPause: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handleChoice = async (allowed: boolean) => {
    // Stop locally before waiting for the server to persist a refusal or withdrawal.
    onPause();
    setSaving(true);
    setError(null);
    const response = await apiClient.post<SharingChoice>(
      '/v1/audit-workspace/live/consent',
      { allowed },
      organizationId,
    );
    setSaving(false);
    if (response.error || !response.data) {
      setError('Your choice could not be saved. Sharing is off. Please try again.');
      return;
    }
    onChoice(response.data);
  };
  return (
    <Dialog open={open} onOpenChange={() => undefined}>
      <DialogContent size="2xl" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Allow your audit view to be followed?</DialogTitle>
          <DialogDescription>
            Choose whether authorized organization administrators can follow your work in this audit
            workspace during this visit.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Text size="sm">
            If you choose Yes, your current audit, selected check, workspace tab, linked evidence
            preview, scrolling and mouse movements are transmitted live. Administrators can see the
            shared audit records and saved changes. They cannot control your mouse or act as you.
          </Text>
          <Text size="sm">
            There is no ongoing viewer indicator or notification when someone joins. Other browser
            tabs, your desktop and unsaved text in forms are not transmitted. Live movements are not
            recorded or replayed.
          </Text>
          <Text size="sm">
            No leaves the audit workspace fully usable without live sharing. Normal audit records,
            saved reviews and changes remain visible to the audit team. You can change your choice
            at any time under Audit settings. Leaving this workspace ends this visit’s transmission.
          </Text>
          {error && (
            <div role="alert">
              <Text variant="destructive">{error}</Text>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={saving} onClick={() => void handleChoice(false)}>
            No, continue without sharing
          </Button>
          <Button disabled={saving} loading={saving} onClick={() => void handleChoice(true)}>
            Yes, allow for this visit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
