'use client';
import { Button, Input } from '@trycompai/design-system';
import { ChevronDown, ChevronUp, Search } from '@trycompai/design-system/icons';
import { useEffect, useMemo, useRef, useState } from 'react';

export function documentMatches({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return [];
  const expression = new RegExp(
    Array.from(query, (char) => '\\u{' + char.codePointAt(0)!.toString(16) + '}').join(''),
    'giu',
  );
  const matches: number[] = [];
  for (const match of text.matchAll(expression)) {
    matches.push(match.index);
    if (matches.length === 300) break;
  }
  return matches;
}

export function AuditDocumentReader({ text }: { text: string }) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const current = useRef<HTMLElement | null>(null);
  const matches = useMemo(() => documentMatches({ text, query }), [text, query]);
  useEffect(() => {
    current.current?.scrollIntoView({ block: 'nearest' });
  }, [active, query]);
  const pieces = useMemo(() => {
    let start = 0;
    const result = matches.map((position, index) => {
      const before = text.slice(start, position);
      start = position + query.length;
      return (
        <span key={position}>
          {before}
          <mark
            ref={index === active ? current : undefined}
            className={
              index === active
                ? 'rounded-sm bg-primary/20 text-foreground ring-1 ring-primary/50'
                : 'rounded-sm bg-muted text-foreground'
            }
          >
            {text.slice(position, start)}
          </mark>
        </span>
      );
    });
    return (
      <>
        {result}
        {text.slice(start)}
      </>
    );
  }, [text, query, matches, active]);
  return (
    <>
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 rounded-lg border bg-background p-3 shadow-sm">
        <Search size={16} className="text-muted-foreground" />
        <div className="min-w-40 flex-1">
          <Input
            aria-label="Find in captured document"
            maxLength={500}
            placeholder="Find in this document…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
          />
        </div>
        <span role="status" className="text-xs tabular-nums text-muted-foreground">
          {query
            ? matches.length
              ? `${active + 1} / ${matches.length}${matches.length === 300 ? '+' : ''}`
              : 'No matches'
            : 'Captured version'}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Previous match"
          disabled={!matches.length}
          onClick={() => setActive((active + matches.length - 1) % matches.length)}
          iconLeft={<ChevronUp size={16} />}
        />
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Next match"
          disabled={!matches.length}
          onClick={() => setActive((active + 1) % matches.length)}
          iconLeft={<ChevronDown size={16} />}
        />
      </div>
      <article className="mx-auto w-full max-w-3xl whitespace-pre-wrap break-words px-2 py-8 text-sm leading-8">
        {pieces}
      </article>
    </>
  );
}
