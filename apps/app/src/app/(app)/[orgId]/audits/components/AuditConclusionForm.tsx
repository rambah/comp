'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Field,
  FieldError,
  FieldLabel,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@trycompai/design-system';
import { useEffect, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import type { WorkspaceAudit, WorkspaceMutation } from '../workspace-types';
const schema = z.object({
  conclusionVerdict: z.enum(['conform', 'substantially_conform', 'not_yet_conform']),
  conclusionNotes: z
    .string()
    .trim()
    .min(1, 'Describe the overall conclusion and limitations.')
    .max(20000),
});
export function AuditConclusionForm({
  audit,
  update,
  onDirtyChange,
}: {
  audit: WorkspaceAudit;
  update: WorkspaceMutation;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      conclusionVerdict: audit.conclusionVerdict ?? undefined,
      conclusionNotes: audit.conclusionNotes ?? '',
    },
  });
  useEffect(() => {
    onDirtyChange(form.formState.isDirty || form.formState.isSubmitting);
    return () => onDirtyChange(false);
  }, [form.formState.isDirty, form.formState.isSubmitting, onDirtyChange]);
  const baseline = useRef(audit.updatedAt);
  useEffect(() => {
    if (form.formState.isDirty || form.formState.isSubmitting) return;
    baseline.current = audit.updatedAt;
    form.reset({
      conclusionVerdict: audit.conclusionVerdict ?? undefined,
      conclusionNotes: audit.conclusionNotes ?? '',
    });
  }, [
    audit.updatedAt,
    audit.conclusionVerdict,
    audit.conclusionNotes,
    form,
    form.formState.isDirty,
    form.formState.isSubmitting,
  ]);
  const handleSave = form.handleSubmit(async (values) => {
    try {
      await update({
        path: `audits/${audit.id}/conclusion`,
        method: 'patch',
        body: { ...values, expectedUpdatedAt: baseline.current },
      });
      form.reset(values);
    } catch {
      /* Mutation reports the error; preserve the draft. */
    }
  });
  return (
    <form className="space-y-4" onSubmit={handleSave}>
      <Field>
        <FieldLabel>Overall conclusion</FieldLabel>
        <Controller
          control={form.control}
          name="conclusionVerdict"
          render={({ field }) => (
            <Select value={field.value ?? ''} onValueChange={field.onChange}>
              <SelectTrigger aria-label="Overall audit conclusion">
                <SelectValue placeholder="Choose a conclusion">
                  {
                    {
                      conform: 'Conforms',
                      substantially_conform:
                        'Substantially conforms, with recorded nonconformities',
                      not_yet_conform: 'Does not yet conform',
                    }[field.value]
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="conform">Conforms</SelectItem>
                <SelectItem value="substantially_conform">
                  Substantially conforms, with recorded nonconformities
                </SelectItem>
                <SelectItem value="not_yet_conform">Does not yet conform</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        <FieldError>{form.formState.errors.conclusionVerdict?.message}</FieldError>
      </Field>
      <Field>
        <FieldLabel htmlFor="audit-conclusion">Reasoning and limitations</FieldLabel>
        <Textarea
          size="full"
          id="audit-conclusion"
          rows={6}
          {...form.register('conclusionNotes')}
        />
        <FieldError>{form.formState.errors.conclusionNotes?.message}</FieldError>
      </Field>
      <Button
        type="submit"
        loading={form.formState.isSubmitting}
        disabled={!form.formState.isDirty}
      >
        Save draft conclusion
      </Button>
    </form>
  );
}
