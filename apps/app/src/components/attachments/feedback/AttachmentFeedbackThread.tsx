import { AttachmentFeedbackForm } from './AttachmentFeedbackForm';
import type { AttachmentFeedback } from './useAttachmentFeedback';

export function AttachmentFeedbackThread({
  item,
  canEdit,
  onSave,
}: {
  item: AttachmentFeedback;
  canEdit: boolean;
  onSave: (values: { comment: string; status?: 'open' | 'resolved' }) => Promise<void>;
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-muted-foreground">
          {item.authorName} · {new Date(item.createdAt).toLocaleString()} ·{' '}
          {item.status === 'open' ? 'Open' : 'Resolved'}
        </p>
        <p className="mt-2 whitespace-pre-wrap break-words text-sm">{item.comment}</p>
      </div>
      {item.responses.map((response) => (
        <div key={response.id} className="border-l-2 pl-3">
          <p className="text-xs text-muted-foreground">
            {response.authorName} · {new Date(response.createdAt).toLocaleString()} ·{' '}
            {response.status === 'open' ? 'Open' : 'Resolved'}
          </p>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm">{response.comment}</p>
        </div>
      ))}
      {canEdit && <AttachmentFeedbackForm item={item} onSave={onSave} />}
    </div>
  );
}
