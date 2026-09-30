'use client';

import { usePermissions } from '@/hooks/use-permissions';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@trycompai/design-system';
import { Edit } from '@trycompai/design-system/icons';
import { useId, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { useSOADocument } from '../hooks/useSOADocument';
import { ApplicableReadOnlyDisplay } from './ApplicableSwatch';
import type { SOAFieldSavePayload } from './soa-field-types';
export type {
  SOAFieldSavePayload,
  SOAProcessedResult,
  SOATableAnswerData,
} from './soa-field-types';

const schema = z
  .object({
    applicability: z.enum(['yes', 'no', 'unset']),
    justification: z.string(),
  })
  .superRefine((value, ctx) => {
    if (value.applicability === 'no' && !value.justification.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['justification'],
        message: 'Explain why this control is not applicable.',
      });
    }
  });
type Fields = z.infer<typeof schema>;

interface EditableSOAFieldsProps {
  documentId: string;
  questionId: string;
  isApplicable: boolean | null;
  justification: string | null;
  isPendingApproval: boolean;
  organizationId: string;
  controlLabel?: string;
  controlObjective?: string | null;
  trigger?: 'applicability' | 'justification';
  onUpdate?: (payload: SOAFieldSavePayload) => void;
}

export function EditableSOAFields({
  documentId,
  questionId,
  isApplicable,
  justification,
  isPendingApproval,
  organizationId,
  controlLabel,
  controlObjective,
  trigger = 'applicability',
  onUpdate,
}: EditableSOAFieldsProps) {
  const { saveAnswer } = useSOADocument({ documentId, organizationId });
  const { hasPermission } = usePermissions();
  const [open, setOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const fieldId = useId();
  const form = useForm<Fields>({ resolver: zodResolver(schema) });
  const { isSubmitting, isDirty, errors } = form.formState;
  const canEdit = hasPermission('audit', 'update') && !isPendingApproval;

  const handleOpen = () => {
    form.reset({
      applicability: isApplicable === null ? 'unset' : isApplicable ? 'yes' : 'no',
      justification: justification ?? '',
    });
    setSaveError(null);
    setOpen(true);
  };
  const handleOpenChange = (next: boolean) => {
    if (!isSubmitting) setOpen(next);
  };
  const handleSave = async (values: Fields) => {
    if (!canEdit) return;
    const applicable = values.applicability === 'unset' ? null : values.applicability === 'yes';
    try {
      await saveAnswer({
        questionId,
        answer: values.justification,
        justification: values.justification,
        isApplicable: applicable,
      });
      onUpdate?.({ isApplicable: applicable, justification: values.justification });
      setOpen(false);
      toast.success('Control updated');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not save your changes. Please try again.';
      setSaveError(message);
      toast.error(message);
    }
  };

  return (
    <>
      {trigger === 'applicability' ? (
        <div className="flex flex-wrap items-center gap-2">
          <ApplicableReadOnlyDisplay isApplicable={isApplicable} />
          {canEdit && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Edit answer"
              onClick={handleOpen}
              iconLeft={<Edit size={16} />}
            />
          )}
        </div>
      ) : canEdit ? (
        <Button variant="ghost" size="sm" onClick={handleOpen} iconLeft={<Edit size={16} />}>
          Edit justification
        </Button>
      ) : null}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent size="4xl" padding="lg" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{controlLabel || 'Edit control'}</DialogTitle>
            <DialogDescription>
              Update applicability and the justification for your organization.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleSave)}>
            <div className="max-h-[65vh] space-y-5 overflow-y-auto pb-6 pr-1">
              {controlObjective && (
                <div className="rounded-lg bg-muted/40 p-4 text-sm leading-relaxed">
                  <p className="mb-1 font-medium">Control objective</p>
                  <p>{controlObjective}</p>
                </div>
              )}
              <div className="max-w-xs space-y-2">
                <label htmlFor={`${fieldId}-applicable`} className="text-sm font-medium">
                  Applicability
                </label>
                <Controller
                  name="applicability"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id={`${fieldId}-applicable`} disabled={isSubmitting}>
                        <SelectValue>
                          {field.value === 'yes'
                            ? 'Applicable'
                            : field.value === 'no'
                              ? 'Not applicable'
                              : 'Not decided'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unset">Not decided</SelectItem>
                        <SelectItem value="yes">Applicable</SelectItem>
                        <SelectItem value="no">Not applicable</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor={fieldId} className="text-sm font-medium">
                  Justification
                </label>
                <Textarea
                  {...form.register('justification')}
                  id={fieldId}
                  size="full"
                  rows={12}
                  style={{ minHeight: '16rem', lineHeight: 1.7 }}
                  disabled={isSubmitting}
                  aria-invalid={!!errors.justification}
                  aria-describedby={errors.justification ? `${fieldId}-error` : undefined}
                  placeholder="Describe why this control applies, how it is implemented, or why it is excluded."
                />
                {errors.justification && (
                  <p id={`${fieldId}-error`} role="alert" className="text-sm text-destructive">
                    {errors.justification.message}
                  </p>
                )}
              </div>
              {saveError && (
                <p role="alert" className="text-sm text-destructive">
                  {saveError}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Changes are saved as a new answer revision and require approval again.
              </p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" loading={isSubmitting} disabled={!isDirty || !canEdit}>
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
