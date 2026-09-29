import { Button } from '@trycompai/design-system';
import { Document, Image } from '@trycompai/design-system/icons';
import { getPreviewType, type PreviewAttachment } from '../attachments/attachment-preview-types';

export function CommentAttachments({
  attachments,
  onPreview,
}: {
  attachments: PreviewAttachment[];
  onPreview: (attachment: PreviewAttachment) => void;
}) {
  return (
    <div className="pt-3 mt-2 border-t border-border/50 flex flex-wrap gap-2">
      {attachments.map((attachment) => (
        <Button
          key={attachment.id}
          variant="outline"
          size="sm"
          iconLeft={
            getPreviewType(attachment.name) === 'image' ? (
              <Image size={16} />
            ) : (
              <Document size={16} />
            )
          }
          title={attachment.name}
          onClick={() => onPreview(attachment)}
        >
          <span className="max-w-[200px] truncate">{attachment.name}</span>
        </Button>
      ))}
    </div>
  );
}
