'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Field,
  FieldError,
  FieldLabel,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@trycompai/design-system';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import type { WorkspaceData, WorkspaceMutation } from '../workspace-types';

const schema = z.object({
  question: z.string().trim().min(1, 'Describe the evidence you need.').max(10000),
  ownerMemberId: z.string().min(1, 'Choose a response coordinator.'),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a due date.'),
});
type Values = z.infer<typeof schema>;

export function AuditRequestDialog({
  controlId,
  members,
  update,
  onClose,
}: {
  controlId: string;
  members: WorkspaceData['members'];
  update: WorkspaceMutation;
  onClose: () => void;
}) {
  const eligible = members.filter((m) => m.canRespond);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { question: '', ownerMemberId: eligible[0]?.id ?? '', dueDate: '' },
  });
  const handleSave = form.handleSubmit(async (values) => {
    try {
      await update({ path: `checks/${controlId}/requests`, body: values });
      onClose();
    } catch {
      /* Preserve the draft after an error. */
    }
  });
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !form.formState.isSubmitting) onClose();
      }}
    >
      <DialogContent size="2xl" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Request evidence</DialogTitle>
          <DialogDescription>
            Ask a precise question and assign a coordinator who can respond in the audit workspace.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-5">
          <Field>
            <FieldLabel htmlFor="audit-question">What do you need?</FieldLabel>
            <Textarea
              style={{ minHeight: 160 }}
              size="full"
              id="audit-question"
              rows={5}
              placeholder="Specify the record, period, sample or clarification required."
              {...form.register('question')}
            />
            <FieldError>{form.formState.errors.question?.message}</FieldError>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>Response coordinator</FieldLabel>
              <Controller
                control={form.control}
                name="ownerMemberId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(v) => field.onChange(v ?? '')}>
                    <SelectTrigger aria-label="Response coordinator">
                      <SelectValue placeholder="Choose a coordinator">
                        {members.find((m) => m.id === field.value)?.name}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {eligible.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError>{form.formState.errors.ownerMemberId?.message}</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="audit-due">Due date</FieldLabel>
              <Input id="audit-due" type="date" {...form.register('dueDate')} />
              <FieldError>{form.formState.errors.dueDate?.message}</FieldError>
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={form.formState.isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" loading={form.formState.isSubmitting}>
              Create request
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
