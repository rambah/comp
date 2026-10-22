'use client';
import { usePermissions } from '@/hooks/use-permissions';
import { Button } from '@trycompai/design-system';
import { Flag } from '@trycompai/design-system/icons';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { AttachmentFeedbackForm } from './AttachmentFeedbackForm';
import { AttachmentFeedbackThread } from './AttachmentFeedbackThread';
import { useAttachmentFeedback } from './useAttachmentFeedback';

export function AttachmentFeedbackPanel({ attachmentId }: { attachmentId: string }) {
  const params = useParams<{ orgId?: string }>();
  const { hasPermission } = usePermissions();
  const organizationId = params?.orgId ?? '';
  const canRead =
    !!organizationId &&
    hasPermission('auditWorkspace', 'read') &&
    hasPermission('evidence', 'read');
  const canEdit = canRead && hasPermission('auditWorkspace', 'update');
  const [expanded, setExpanded] = useState(false);
  const [offset, setOffset] = useState(0);
  const { data, error, isLoading, mutate, save } = useAttachmentFeedback({
    organizationId,
    attachmentId,
    offset,
    enabled: canRead && expanded,
  });
  if (!canRead) return null;
  return (
    <div className="mt-3 border-t pt-3">
      <Button
        variant="outline"
        size="sm"
        iconLeft={<Flag size={16} />}
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        {expanded
          ? 'Hide attachment feedback'
          : canEdit
            ? 'Flag / review attachment'
            : 'View attachment feedback'}
      </Button>
      {expanded && (
        <div className="mt-3 max-h-[35dvh] space-y-4 overflow-auto p-1">
          <p className="text-xs text-muted-foreground">
            Feedback appears in Audit workspace → Requests across all audits. Resolving feedback
            does not approve the evidence.
          </p>
          {canEdit && (
            <AttachmentFeedbackForm
              onSave={(values) => save({ body: { attachmentId, comment: values.comment } })}
            />
          )}
          {isLoading && <p role="status">Loading feedback…</p>}
          {error && (
            <div role="alert">
              Could not load feedback.{' '}
              <Button size="sm" variant="outline" onClick={() => void mutate()}>
                Retry
              </Button>
            </div>
          )}
          {data && !data.count && (
            <p className="text-sm text-muted-foreground">No feedback for this attachment yet.</p>
          )}
          {data?.data.map((item) => (
            <div key={item.id} className="rounded-md border p-3">
              <AttachmentFeedbackThread
                item={item}
                canEdit={canEdit}
                onSave={(values) =>
                  save({ id: item.id, body: { ...values, expectedUpdatedAt: item.updatedAt } })
                }
              />
            </div>
          ))}
          <div className="flex gap-2">
            {offset > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setOffset(Math.max(0, offset - 50))}
              >
                Previous feedback
              </Button>
            )}
            {data?.nextOffset != null && (
              <Button size="sm" variant="outline" onClick={() => setOffset(data.nextOffset!)}>
                More feedback
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
