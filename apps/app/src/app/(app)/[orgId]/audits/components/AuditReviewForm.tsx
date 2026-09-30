'use client';
import { apiClient } from '@/lib/api-client';
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
  Text,
  Textarea,
} from '@trycompai/design-system';
import { Checkmark, Flag } from '@trycompai/design-system/icons';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { CONTROL_RESULT_LABELS } from '../../documents/isms/components/internal-audit-constants';
import type { AuditCheck } from '../workspace-types';
import { formatAuditDateTime } from '../workspace-types';

const schema = z.object({
  notes: z.string().max(20000),
  result: z.enum([
    '',
    'conformity_confirmed',
    'nonconformity_raised',
    'observation_raised',
    'not_sampled',
  ]),
});
type Values = z.infer<typeof schema>;

export function AuditReviewForm({
  check,
  organizationId,
  canEdit,
  canRecordFinding = false,
  onBusyChange,
  onSaved,
  onComplete,
  onFinding,
}: {
  check: AuditCheck;
  organizationId: string;
  canEdit: boolean;
  canRecordFinding?: boolean;
  onBusyChange: (busy: boolean) => void;
  onSaved: () => Promise<unknown>;
  onComplete: () => void;
  onFinding: () => void;
}) {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { notes: check.notes ?? '', result: check.result ?? '' },
  });
  const notes = useWatch({ control: form.control, name: 'notes' });
  const version = useRef(check.updatedAt);
  const savedNotes = useRef(check.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const busy = saving || notes !== savedNotes.current;

  useEffect(() => {
    if (
      new Date(check.updatedAt).getTime() <= new Date(version.current).getTime() ||
      form.getValues('notes') !== savedNotes.current ||
      saving
    )
      return;
    version.current = check.updatedAt;
    savedNotes.current = check.notes ?? '';
    form.reset({ notes: check.notes ?? '', result: check.result ?? '' });
  }, [check.updatedAt, check.notes, check.result, saving, form]);

  useEffect(() => {
    onBusyChange(busy);
    return () => onBusyChange(false);
  }, [busy, onBusyChange]);
  useEffect(() => {
    if (!busy) return;
    const handleUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [busy]);

  useEffect(() => {
    if (!canEdit || saving || saveError || notes === savedNotes.current) return;
    const timer = setTimeout(async () => {
      setSaving(true);
      try {
        const res = await apiClient.patch<AuditCheck>(
          `/v1/audit-workspace/checks/${check.id}/review`,
          { expectedUpdatedAt: version.current, notes },
          organizationId,
        );
        if (res.error || !res.data) throw new Error(res.error || 'Unable to save review notes.');
        version.current = res.data.updatedAt;
        savedNotes.current = notes;
        setRevision((r) => r + 1);
        await onSaved();
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : 'Unable to save review notes.');
      } finally {
        setSaving(false);
      }
    }, 900);
    return () => clearTimeout(timer);
  }, [notes, saving, saveError, canEdit, check.id, organizationId, revision, onSaved]);

  const handleComplete = form.handleSubmit(async (values) => {
    if (!values.notes.trim()) {
      form.setError('notes', {
        message: 'Record the sample, evidence examined and your reasoning.',
      });
      return;
    }
    if (!values.result) {
      form.setError('result', { message: 'Choose a conclusion.' });
      return;
    }
    setSaving(true);
    try {
      const res = await apiClient.patch<AuditCheck>(
        `/v1/audit-workspace/checks/${check.id}/review`,
        { ...values, expectedUpdatedAt: version.current },
        organizationId,
      );
      if (res.error || !res.data) throw new Error(res.error || 'Unable to complete the review.');
      version.current = res.data.updatedAt;
      savedNotes.current = values.notes;
      setRevision((r) => r + 1);
      await onSaved();
      onComplete();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Unable to complete the review.');
    } finally {
      setSaving(false);
    }
  });

  return (
    <form
      data-audit-live-target="review"
      onSubmit={handleComplete}
      className="audit-surface min-w-0 space-y-5 p-5 sm:p-6 xl:sticky xl:top-6"
    >
      <div className="audit-detail-heading flex items-center justify-between">
        <Text weight="medium">Your review</Text>
        <span className="rounded-full bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary text-muted-foreground">
          Auto-save
        </span>
      </div>
      <Text size="sm" variant="muted">
        Record the sample, source records and observations supporting your conclusion.
      </Text>
      <Field>
        <FieldLabel htmlFor="review-notes">Sample and review notes</FieldLabel>
        <Textarea
          size="full"
          data-audit-live-target="review-notes"
          id="review-notes"
          rows={10}
          style={{ minHeight: 220 }}
          placeholder="Which records did you sample? What did you observe? How does the evidence support your conclusion?"
          readOnly={!canEdit}
          {...form.register('notes')}
        />
        <FieldError>{form.formState.errors.notes?.message}</FieldError>
      </Field>
      <div role="status">
        <Text size="xs" variant="muted">
          {saving
            ? 'Saving…'
            : saveError
              ? 'Changes not saved'
              : busy
                ? 'Unsaved changes…'
                : 'Notes saved'}{' '}
          · Shared with the audit team
        </Text>
      </div>
      {saveError && (
        <div role="alert" className="space-y-2">
          <Text size="sm" variant="destructive">
            {saveError}
          </Text>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setSaveError(null);
              setRevision((r) => r + 1);
            }}
          >
            Retry
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              void navigator.clipboard.writeText(form.getValues('notes')).then(
                () => toast.success('Draft copied'),
                () => toast.error('Unable to copy. Select the notes and copy them manually.'),
              );
            }}
          >
            Copy draft
          </Button>
          <Text size="xs" variant="muted">
            If the record changed elsewhere, copy your notes before reloading. Your draft has not
            been discarded.
          </Text>
        </div>
      )}
      <Field>
        <FieldLabel>Conclusion</FieldLabel>
        <Controller
          control={form.control}
          name="result"
          render={({ field }) => (
            <Select
              value={field.value || 'unset'}
              onValueChange={(v) => field.onChange(v === 'unset' ? '' : v)}
              disabled={!canEdit || saving}
            >
              <SelectTrigger aria-label="Review conclusion">
                <SelectValue>
                  {field.value ? CONTROL_RESULT_LABELS[field.value] : 'Choose a conclusion'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent data-audit-live-surface>
                <SelectItem value="unset">Choose a conclusion</SelectItem>
                {Object.entries(CONTROL_RESULT_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError>{form.formState.errors.result?.message}</FieldError>
      </Field>
      {canEdit && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="submit"
            loading={saving}
            disabled={busy || !!saveError}
            iconLeft={<Checkmark size={16} />}
          >
            Complete & next
          </Button>
          {canRecordFinding && (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              iconLeft={<Flag size={16} />}
              onClick={onFinding}
            >
              Record a finding
            </Button>
          )}
        </div>
      )}
      {check.reviewedAt && (
        <Text size="xs" variant="muted">
          Reviewed by {check.reviewedBy} · {formatAuditDateTime(check.reviewedAt)}
        </Text>
      )}
    </form>
  );
}
