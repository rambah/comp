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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Text,
  Textarea,
} from '@trycompai/design-system';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  REQUEST_LABELS,
  formatAuditDate,
  type AuditRequest,
  type WorkspaceMutation,
} from '../workspace-types';

const schema = z.object({
  content: z.string().trim().min(1, 'Add a response or explain your decision.').max(10000),
  status: z.enum(['open', 'submitted', 'changes_requested', 'accepted']),
});
type Values = z.infer<typeof schema>;
export function AuditResponseDialog({
  request,
  canEdit,
  update,
  onClose,
}: {
  request: AuditRequest;
  canEdit: boolean;
  update: WorkspaceMutation;
  onClose: () => void;
}) {
  const choices =
    request.status === 'submitted'
      ? (['accepted', 'changes_requested'] as const)
      : request.status === 'accepted'
        ? (['open'] as const)
        : (['submitted', 'open'] as const);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { content: '', status: choices[0] },
  });
  const handleSave = form.handleSubmit(async (values) => {
    try {
      await update({
        path: `requests/${request.id}/responses`,
        body: { ...values, expectedUpdatedAt: request.updatedAt },
      });
      onClose();
    } catch {
      /* Keep the response available for conflict resolution. */
    }
  });
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !form.formState.isSubmitting) onClose();
      }}
    >
      <DialogContent size="3xl" style={{ maxHeight: '90dvh', overflowY: 'auto' }}>
        <DialogHeader>
          <DialogTitle>Evidence request</DialogTitle>
          <DialogDescription>
            {REQUEST_LABELS[request.status]} · Due {formatAuditDate(request.dueDate)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/20 p-4">
            <Text size="sm" weight="medium">
              {request.createdBy}
            </Text>
            <p className="mt-2 whitespace-pre-wrap text-sm">{request.question}</p>
          </div>
          {request.messages.map((m) => (
            <div key={m.id} className="border-l-2 pl-4">
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>{m.authorName}</span>
                <span>{formatAuditDate(m.createdAt)}</span>
                <span>{REQUEST_LABELS[m.status]}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm">{m.content}</p>
            </div>
          ))}
        </div>
        {canEdit && (
          <form onSubmit={handleSave} className="mt-5 space-y-4">
            <Field>
              <FieldLabel htmlFor="audit-response">Response or review decision</FieldLabel>
              <Textarea
                style={{ minHeight: 160 }}
                size="full"
                id="audit-response"
                rows={5}
                placeholder="Describe the evidence supplied, reference linked files or explain the review decision."
                {...form.register('content')}
              />
              <FieldError>{form.formState.errors.content?.message}</FieldError>
            </Field>
            <Field>
              <FieldLabel>Next status</FieldLabel>
              <Controller
                control={form.control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger aria-label="Next request status">
                      <SelectValue>{REQUEST_LABELS[field.value]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {choices.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s === 'open' ? 'Keep open / reopen' : REQUEST_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={form.formState.isSubmitting}
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button type="submit" loading={form.formState.isSubmitting}>
                Save response
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
