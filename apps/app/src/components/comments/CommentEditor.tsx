'use client';

import { useApi } from '@/hooks/use-api';
import { useCommentActions } from '@/hooks/use-comments-api';
import { zodResolver } from '@hookform/resolvers/zod';
import type { JSONContent } from '@tiptap/react';
import { Button } from '@trycompai/design-system';
import { useRef, type ComponentProps } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { CommentAttachmentPicker } from './CommentAttachmentPicker';
import { CommentRichTextField } from './CommentRichTextField';

function parseContent(content: string): JSONContent {
  try {
    const parsed: unknown = JSON.parse(content);
    if (parsed && typeof parsed === 'object' && 'type' in parsed && parsed.type === 'doc')
      return parsed as JSONContent;
  } catch {
    /* Legacy comments can contain plain text. */
  }
  return {
    type: 'doc',
    content: content.split('\n').map((text) => ({
      type: 'paragraph',
      ...(text ? { content: [{ type: 'text', text }] } : {}),
    })),
  };
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Unable to read ${file.name}`));
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error(`Unable to read ${file.name}`));
        return;
      }
      resolve(reader.result.slice(reader.result.indexOf(',') + 1));
    };
    reader.readAsDataURL(file);
  });
}

const editSchema = z.object({
  content: z.custom<JSONContent | null>(
    (value) =>
      value === null ||
      (typeof value === 'object' && value !== null && 'type' in value && value.type === 'doc'),
  ),
  files: z.array(z.instanceof(File).refine((file) => file.size <= 100 * 1024 * 1024)),
});
type EditValues = z.infer<typeof editSchema>;
export function CommentEditor({
  comment,
  members,
  onCancel,
  onSaved,
  refreshComments,
}: {
  comment: { id: string; content: string };
  members: ComponentProps<typeof CommentRichTextField>['members'];
  onCancel: () => void;
  onSaved: () => void;
  refreshComments: () => void;
}) {
  const api = useApi();
  const { updateComment } = useCommentActions();
  const savedContent = useRef(comment.content);
  const form = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { content: parseContent(comment.content), files: [] },
  });
  const { isSubmitting, dirtyFields } = form.formState;

  const handleSave = form.handleSubmit(async (values) => {
    const content = dirtyFields.content
      ? JSON.stringify(values.content ?? { type: 'doc', content: [] })
      : savedContent.current;
    if (content === savedContent.current && values.files.length === 0) {
      onSaved();
      return;
    }
    let textSaved = false;
    try {
      if (content !== savedContent.current) {
        await updateComment(comment.id, { content });
        savedContent.current = content;
        textSaved = true;
        refreshComments();
      }
      // Upload sequentially and remove each confirmed success from the queue.
      // A later failure keeps only the remaining files available for retry.
      for (const file of values.files) {
        const fileData = await readFile(file);
        const result = await api.post(`/v1/comments/${comment.id}/attachments`, {
          fileName: file.name,
          fileType: file.type || 'application/octet-stream',
          fileData,
        });
        if (result.error) throw new Error(`${file.name}: ${result.error}`);
        form.setValue(
          'files',
          form.getValues('files').filter((pending) => pending !== file),
        );
        refreshComments();
      }
      toast.success('Comment updated successfully.');
      onSaved();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save comment.';
      toast.error(`${textSaved ? 'Comment text saved. ' : ''}${message}`);
    }
  });

  return (
    <div className="space-y-3" aria-label="Edit comment">
      <Controller
        control={form.control}
        name="content"
        render={({ field }) => (
          <CommentRichTextField
            value={field.value}
            onChange={field.onChange}
            members={members}
            disabled={isSubmitting}
            placeholder="Edit comment..."
          />
        )}
      />
      <Controller
        control={form.control}
        name="files"
        render={({ field }) => (
          <CommentAttachmentPicker
            files={field.value}
            onChange={field.onChange}
            disabled={isSubmitting}
          />
        )}
      />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" disabled={isSubmitting} onClick={onCancel}>
          Cancel
        </Button>
        <Button
          size="sm"
          loading={isSubmitting}
          aria-label="Save Changes"
          onClick={() => void handleSave()}
        >
          Save Changes
        </Button>
      </div>
    </div>
  );
}
