'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Textarea } from '@trycompai/design-system';
import { ArrowUp, Locked, Renew } from '@trycompai/design-system/icons';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
const schema = z.object({
  prompt: z
    .string()
    .trim()
    .min(1, 'Enter a research question')
    .max(6000, 'Use at most 6,000 characters'),
});
export function ResearchComposer({
  disabled,
  running,
  sending,
  suggestion,
  onAsk,
}: {
  disabled: boolean;
  running: boolean;
  sending: boolean;
  suggestion: { text: string } | null;
  onAsk: (prompt: string) => Promise<void>;
}) {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { prompt: '' },
  });
  useEffect(() => {
    if (suggestion) {
      form.setValue('prompt', suggestion.text);
      form.setFocus('prompt');
    }
  }, [suggestion, form]);
  const handleSubmit = form.handleSubmit(async ({ prompt }) => {
    await onAsk(prompt);
    form.reset();
  });
  return (
    <form
      onSubmit={(e) => {
        void handleSubmit(e).catch(() => undefined);
      }}
      className="border-t bg-background p-4 sm:p-5"
    >
      <div className="rounded-xl border bg-muted/20 p-3 shadow-sm focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10">
        <Textarea
          size="full"
          {...form.register('prompt')}
          aria-label="Ask the audit research assistant"
          placeholder="Ask a question, compare evidence, or explore a potential gap…"
          rows={3}
          maxLength={6000}
          disabled={disabled || running || sending}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void handleSubmit().catch(() => undefined);
            }
          }}
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <Locked size={13} />
            Organization sources · read-only research
          </span>
          <Button
            type="submit"
            size="sm"
            disabled={disabled || running || sending}
            loading={sending}
            iconLeft={running ? <Renew size={14} /> : <ArrowUp size={14} />}
          >
            {running ? 'Researching' : 'Ask Comp AI'}
          </Button>
        </div>
      </div>
      {form.formState.errors.prompt && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {form.formState.errors.prompt.message}
        </p>
      )}
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Saved with this audit and visible to authorized audit team members. Verify AI conclusions
        against the sources.
      </p>
    </form>
  );
}
