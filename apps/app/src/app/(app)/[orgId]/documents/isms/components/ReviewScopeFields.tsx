'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@trycompai/design-system';
import { Controller, useWatch, type Control } from 'react-hook-form';
import type { ReviewDetailsFormValues } from './management-review-schema';
import { IsmsFieldLabel } from './shared';

export function ReviewScopeFields({ control }: { control: Control<ReviewDetailsFormValues> }) {
  const scope = useWatch({ control, name: 'reviewScope' });
  return (
    <>
      <IsmsFieldLabel label="Review scope">
        <Controller
          control={control}
          name="reviewScope"
          render={({ field }) => (
            <Select value={field.value ?? 'full'} onValueChange={field.onChange}>
              <SelectTrigger aria-label="Review scope">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Full management review</SelectItem>
                <SelectItem value="targeted">Targeted follow-up</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </IsmsFieldLabel>
      {scope === 'targeted' ? (
        <IsmsFieldLabel label="Scope and reference to the full review">
          <Controller
            control={control}
            name="scopeNotes"
            render={({ field: { ref: _ref, ...field } }) => (
              <Textarea
                {...field}
                value={field.value ?? ''}
                rows={3}
                aria-label="Review scope notes"
                placeholder="Describe the topics addressed and identify the full review covering the remaining inputs."
              />
            )}
          />
        </IsmsFieldLabel>
      ) : null}
    </>
  );
}
