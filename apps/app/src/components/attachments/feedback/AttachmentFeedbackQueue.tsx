'use client';
import { usePermissions } from '@/hooks/use-permissions';
import { Button, Section } from '@trycompai/design-system';
import { useState } from 'react';
import { AttachmentPreviewDialog } from '../AttachmentPreviewDialog';
import type { PreviewAttachment } from '../attachment-preview-types';
import { AttachmentFeedbackThread } from './AttachmentFeedbackThread';
import { useAttachmentFeedback, type AttachmentFeedback } from './useAttachmentFeedback';

function sourceUrl({ item, organizationId }: { item: AttachmentFeedback; organizationId: string }) {
  const paths: Record<string, string> = { task: 'tasks', risk: 'risk', vendor: 'vendors' };
  const path = paths[item.entityType];
  return path ? `/${organizationId}/${path}/${encodeURIComponent(item.entityId)}` : null;
}
export function AttachmentFeedbackQueue({
  organizationId,
  canEdit,
}: {
  organizationId: string;
  canEdit: boolean;
}) {
  const { hasPermission } = usePermissions();
  const [status, setStatus] = useState<'open' | 'resolved'>('open');
  const [offset, setOffset] = useState(0);
  const [preview, setPreview] = useState<PreviewAttachment | null>(null);
  const canRead = hasPermission('evidence', 'read') && hasPermission('auditWorkspace', 'read');
  const { data, error, isLoading, mutate, save } = useAttachmentFeedback({
    organizationId,
    status,
    offset,
    enabled: canRead,
  });
  if (!canRead) return null;
  return (
    <Section
      title="Attachment feedback"
      description="Flagged evidence across all audits. Correct the file at its source, then explain the correction here. This does not change audit conclusions or approve evidence."
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          {(['open', 'resolved'] as const).map((value) => (
            <Button
              key={value}
              size="sm"
              variant={status === value ? 'default' : 'outline'}
              onClick={() => {
                setStatus(value);
                setOffset(0);
              }}
            >
              {value === 'open' ? 'Open' : 'Resolved'}
              {status === value && data ? ` (${data.count})` : ''}
            </Button>
          ))}
        </div>
        {isLoading && <p role="status">Loading attachment feedback…</p>}
        {error && (
          <div role="alert">
            Unable to load attachment feedback.{' '}
            <Button variant="outline" size="sm" onClick={() => void mutate()}>
              Retry
            </Button>
          </div>
        )}
        {data?.count === 0 && (
          <p className="text-sm text-muted-foreground">No {status} attachment feedback.</p>
        )}
        {data?.data.map((item) => {
          const source = sourceUrl({ item, organizationId });
          return (
            <article key={item.id} className="space-y-4 rounded-lg border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h3 className="break-all font-medium">{item.attachmentName}</h3>
                <div className="flex flex-wrap gap-2">
                  {item.attachmentAvailable ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPreview({ id: item.attachmentId, name: item.attachmentName })
                      }
                    >
                      Preview attachment
                    </Button>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Original attachment removed; feedback retained.
                    </p>
                  )}
                  {source && (
                    <Button variant="outline" size="sm" render={<a href={source} />}>
                      Open source / correct evidence
                    </Button>
                  )}
                </div>
              </div>
              <AttachmentFeedbackThread
                item={item}
                canEdit={canEdit}
                onSave={async (values) => {
                  await save({
                    id: item.id,
                    body: { ...values, expectedUpdatedAt: item.updatedAt },
                  });
                  if (offset > 0 && data.data.length === 1 && values.status !== status)
                    setOffset(0);
                }}
              />
            </article>
          );
        })}
        <div className="flex gap-2">
          {offset > 0 && (
            <Button size="sm" variant="outline" onClick={() => setOffset(Math.max(0, offset - 50))}>
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
      <AttachmentPreviewDialog attachment={preview} onClose={() => setPreview(null)} />
    </Section>
  );
}
