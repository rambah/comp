'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Field, FieldError, FieldLabel, Textarea } from '@trycompai/design-system';
import { useId } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import type { AttachmentFeedback } from './useAttachmentFeedback';

const schema = z.object({
  comment: z
    .string()
    .trim()
    .min(1, 'Please explain what needs attention.')
    .max(5000, 'Use at most 5,000 characters.'),
});
export function AttachmentFeedbackForm({
  item,
  onSave,
}: {
  item?: AttachmentFeedback;
  onSave: (values: { comment: string; status?: 'open' | 'resolved' }) => Promise<void>;
}) {
  const inputId = useId();
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { comment: '' },
  });
  const handleSave = (status?: 'open' | 'resolved') =>
    form.handleSubmit(async (values) => {
      try {
        await onSave({ ...values, ...(status ? { status } : {}) });
        form.reset();
        toast.success(
          item ? 'Feedback updated' : 'Attachment flagged — visible in Audit workspace → Requests',
        );
      } catch (error) {
        form.setError('root', {
          message: error instanceof Error ? error.message : 'Unable to save feedback.',
        });
      }
    });
  return (
    <form onSubmit={handleSave(item?.status)} className="space-y-3">
      <Field>
        <FieldLabel htmlFor={inputId}>
          {item ? 'Response / correction' : 'What needs to be corrected?'}
        </FieldLabel>
        <Textarea
          id={inputId}
          size="full"
          rows={3}
          maxLength={5000}
          placeholder={
            item
              ? 'Describe the correction and where to find the updated evidence.'
              : 'For example: the screenshot does not show the date or the relevant setting.'
          }
          {...form.register('comment')}
        />
        <FieldError>{form.formState.errors.comment?.message}</FieldError>
      </Field>
      {form.formState.errors.root && (
        <p role="alert" className="text-sm text-destructive">
          {form.formState.errors.root.message}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" loading={form.formState.isSubmitting}>
          {item ? 'Add response' : 'Flag attachment'}
        </Button>
        {item && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={form.formState.isSubmitting}
            onClick={() => void handleSave(item.status === 'open' ? 'resolved' : 'open')()}
          >
            {item.status === 'open' ? 'Resolve with response' : 'Reopen with response'}
          </Button>
        )}
      </div>
    </form>
  );
}
