'use client';

import { Button, Textarea } from '@trycompai/design-system';
import { useRef, useState, type ComponentProps } from 'react';
import { IsmsMarkdown } from './IsmsMarkdown';

type EditorProps = Omit<
  ComponentProps<typeof Textarea>,
  'onChange' | 'value' | 'defaultValue' | 'ref'
> & {
  value?: string;
  onChange: (value: string) => void;
};

/** Controlled by the surrounding RHF form; switching preview never saves. */
export function IsmsMarkdownEditor({
  value = '',
  onChange,
  disabled,
  readOnly,
  ...props
}: EditorProps) {
  const textarea = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(false);
  const label = props['aria-label'] || 'Text';
  const handleFormat = ({
    prefix,
    suffix = '',
    placeholder,
  }: {
    prefix: string;
    suffix?: string;
    placeholder: string;
  }) => {
    const start = textarea.current?.selectionStart ?? value.length;
    const end = textarea.current?.selectionEnd ?? value.length;
    const selected = value.slice(start, end) || placeholder;
    const leading = prefix.endsWith(' ') && start > 0 && value[start - 1] !== '\n' ? '\n' : '';
    onChange(value.slice(0, start) + leading + prefix + selected + suffix + value.slice(end));
    requestAnimationFrame(() => {
      textarea.current?.focus();
      textarea.current?.setSelectionRange(
        start + leading.length + prefix.length,
        start + leading.length + prefix.length + selected.length,
      );
    });
  };
  return (
    <div className="min-w-0 rounded-md border bg-background">
      <div
        className="flex flex-wrap items-center gap-1 border-b p-1.5"
        role="group"
        aria-label={`Formatting: ${label}`}
      >
        {!preview && (
          <>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={disabled || readOnly}
              aria-label={`Bold: ${label}`}
              onClick={() => handleFormat({ prefix: '**', suffix: '**', placeholder: 'bold text' })}
            >
              Bold
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={disabled || readOnly}
              aria-label={`Heading: ${label}`}
              onClick={() => handleFormat({ prefix: '## ', placeholder: 'Heading' })}
            >
              Heading
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={disabled || readOnly}
              aria-label={`List: ${label}`}
              onClick={() => handleFormat({ prefix: '- ', placeholder: 'List item' })}
            >
              List
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={disabled || readOnly}
              aria-label={`Link: ${label}`}
              onClick={() =>
                handleFormat({
                  prefix: '[',
                  suffix: '](https://example.com)',
                  placeholder: 'Link text',
                })
              }
            >
              Link
            </Button>
          </>
        )}
        <div className="ml-auto">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            aria-label={`${preview ? 'Edit text' : 'Preview formatting'}: ${label}`}
            aria-pressed={preview}
            onClick={() => setPreview(!preview)}
          >
            {preview ? 'Edit text' : 'Preview'}
          </Button>
        </div>
      </div>
      {preview ? (
        <div className="min-h-24 p-3" role="region" aria-label={`Preview: ${label}`}>
          <IsmsMarkdown>{value || 'Nothing to preview yet.'}</IsmsMarkdown>
        </div>
      ) : (
        <Textarea
          size="full"
          {...props}
          ref={textarea}
          value={value}
          disabled={disabled}
          readOnly={readOnly}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      <p className="px-3 py-2 text-xs text-muted-foreground">
        Markdown: **bold**, *italic*, ## heading, - list, [label](https://…). Preview does not save
        changes.
      </p>
    </div>
  );
}
