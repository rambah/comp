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
export const findingTypes = {
  nc_major: 'Major nonconformity',
  nc_minor: 'Minor nonconformity',
  ofi: 'Opportunity for improvement',
  observation: 'Observation',
};
const schema = z.object({
  type: z.enum(['nc_major', 'nc_minor', 'ofi', 'observation']),
  description: z.string().trim().min(1, 'Describe the finding and supporting evidence.').max(20000),
  ownerMemberId: z.string(),
  dueDate: z.string(),
});
type Values = z.infer<typeof schema>;
export function AuditFindingDialog({
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
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'observation', description: '', ownerMemberId: '', dueDate: '' },
  });
  const handleSave = form.handleSubmit(async (values) => {
    try {
      await update({
        path: `checks/${controlId}/findings`,
        body: {
          ...values,
          ownerMemberId: values.ownerMemberId || undefined,
          dueDate: values.dueDate || undefined,
        },
      });
      onClose();
    } catch {
      /* Preserve unsaved finding. */
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
          <DialogTitle>Record a finding</DialogTitle>
          <DialogDescription>
            This finding is saved in the existing internal audit register and linked to this check.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          <Field>
            <FieldLabel>Classification</FieldLabel>
            <Controller
              control={form.control}
              name="type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger aria-label="Finding classification">
                    <SelectValue>{findingTypes[field.value]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(findingTypes).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="audit-finding">Condition, evidence and criterion</FieldLabel>
            <Textarea
              size="full"
              style={{ minHeight: 200 }}
              id="audit-finding"
              rows={6}
              {...form.register('description')}
            />
            <FieldError>{form.formState.errors.description?.message}</FieldError>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>Action owner</FieldLabel>
              <Controller
                control={form.control}
                name="ownerMemberId"
                render={({ field }) => (
                  <Select
                    value={field.value || 'none'}
                    onValueChange={(v) => field.onChange(v === 'none' ? '' : v)}
                  >
                    <SelectTrigger aria-label="Finding owner">
                      <SelectValue>
                        {members.find((m) => m.id === field.value)?.name ?? 'Unassigned'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {members.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="finding-due">Due date</FieldLabel>
              <Input type="date" id="finding-due" {...form.register('dueDate')} />
            </Field>
          </div>
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
              Record finding
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
