'use client';

import { Button } from '@trycompai/design-system';
import { Attachment, Close, Document } from '@trycompai/design-system/icons';
import { useRef } from 'react';
import { toast } from 'sonner';

export function CommentAttachmentPicker({
  files,
  onChange,
  disabled,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  disabled: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-3">
      <input
        ref={input}
        type="file"
        multiple
        className="hidden"
        aria-label="Choose comment attachments"
        disabled={disabled}
        onChange={(event) => {
          const selected = Array.from(event.target.files ?? []);
          event.target.value = '';
          const oversized = selected.find((file) => file.size > 100 * 1024 * 1024);
          if (oversized) {
            toast.error(`File "${oversized.name}" exceeds the 100MB limit.`);
            return;
          }
          onChange([...files, ...selected]);
        }}
      />
      <Button
        variant="outline"
        size="sm"
        iconLeft={<Attachment size={16} />}
        disabled={disabled}
        onClick={() => input.current?.click()}
      >
        Add attachments
      </Button>
      {files.length > 0 && (
        <div className="space-y-2" aria-label="Pending attachments">
          {files.map((file, index) => (
            <div key={`${file.name}-${index}`} className="flex items-center gap-2 text-sm">
              <Document size={16} />
              <span className="min-w-0 flex-1 break-all">{file.name}</span>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove ${file.name}`}
                disabled={disabled}
                iconLeft={<Close size={16} />}
                onClick={() => onChange(files.filter((_, i) => i !== index))}
              />
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            Files will be added when you save. For screenshots, ensure your organization name is
            visible.
          </p>
        </div>
      )}
    </div>
  );
}
