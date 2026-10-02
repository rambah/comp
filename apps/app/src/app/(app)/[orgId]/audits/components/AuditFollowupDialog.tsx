'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import type { WorkspaceAudit, WorkspaceMutation } from '../workspace-types';
const schema = z
  .object({
    status: z.enum(['open', 'in_progress', 'closed']),
    closureEvidence: z.string().max(20000),
  })
  .refine((v) => v.status !== 'closed' || v.closureEvidence.trim().length > 0, {
    path: ['closureEvidence'],
    message: 'Describe the resolution and closure evidence.',
  });
export function AuditFollowupDialog({
  finding,
  update,
  onClose,
}: {
  finding: WorkspaceAudit['findings'][number];
  update: WorkspaceMutation;
  onClose: () => void;
}) {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { status: finding.status, closureEvidence: finding.closureEvidence ?? '' },
  });
  const handleSave = form.handleSubmit(async (values) => {
    try {
      await update({
        path: `findings/${finding.id}`,
        method: 'patch',
        body: { ...values, expectedUpdatedAt: finding.updatedAt },
      });
      onClose();
    } catch {
      /* Keep draft on conflict. */
    }
  });
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !form.formState.isSubmitting) onClose();
      }}
    >
      <DialogContent data-audit-live-surface size="2xl" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{finding.reference} · Follow-up</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSave}>
          <Field>
            <FieldLabel>Status</FieldLabel>
            <Controller
              control={form.control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger aria-label="Finding status">
                    <SelectValue>
                      {{ open: 'Open', in_progress: 'In progress', closed: 'Closed' }[field.value]}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent data-audit-live-surface>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In progress</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="closure-evidence">Actions and closure evidence</FieldLabel>
            <Textarea
              style={{ minHeight: 180 }}
              size="full"
              id="closure-evidence"
              rows={7}
              {...form.register('closureEvidence')}
            />
            <FieldError>{form.formState.errors.closureEvidence?.message}</FieldError>
          </Field>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={form.formState.isSubmitting}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" loading={form.formState.isSubmitting}>
              Save follow-up
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
