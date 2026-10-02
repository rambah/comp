'use client';
import {
  Button,
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@trycompai/design-system';
import { Chat, Document, Flag, List, Search } from '@trycompai/design-system/icons';
import { useEffect, useState } from 'react';
import { auditSearchItems, type AuditSearchItem } from '../audit-search';
import type { WorkspaceAudit } from '../workspace-types';
const icons = { Checks: List, Evidence: Document, Requests: Chat, Findings: Flag };
export function AuditSearch({
  audit,
  disabled,
  onNavigate,
}: {
  audit: WorkspaceAudit;
  disabled: boolean;
  onNavigate: (item: AuditSearchItem) => void;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (disabled || event.repeat || document.querySelector('[role="dialog"]')) return;
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [disabled]);
  const items = auditSearchItems(audit);
  return (
    <>
      <Button
        variant="outline"
        disabled={disabled}
        iconLeft={<Search size={16} />}
        onClick={() => setOpen(true)}
      >
        Find in audit{' '}
        <kbd className="ml-3 hidden rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">
          ⌘ / Ctrl ⇧ K
        </kbd>
      </Button>
      <CommandDialog
        open={open && !disabled}
        onOpenChange={setOpen}
        title="Find anything in this audit"
        description="Search checks, linked evidence, questions and findings. Use arrow keys to move and Enter to open."
      >
        <Command data-audit-live-surface>
          <CommandInput
            placeholder="Find a check, document, question or finding…"
            aria-label="Search everything in this audit"
          />
          <CommandList>
            <CommandEmpty>No matches. Try a document title or a word from the check.</CommandEmpty>
            {(Object.keys(icons) as (keyof typeof icons)[]).map((group) => (
              <CommandGroup key={group} heading={group}>
                {items
                  .filter((item) => item.group === group)
                  .map((item) => {
                    const Icon = icons[group];
                    return (
                      <CommandItem
                        key={item.id}
                        value={`${item.id} ${item.title} ${item.detail}`}
                        onSelect={() => {
                          setOpen(false);
                          onNavigate(item);
                        }}
                      >
                        <Icon size={17} />
                        <div className="min-w-0 py-1">
                          <p className="truncate text-sm">{item.title}</p>
                          <p className="truncate text-xs text-muted-foreground">{item.detail}</p>
                        </div>
                        <CommandShortcut>↵</CommandShortcut>
                      </CommandItem>
                    );
                  })}
              </CommandGroup>
            ))}
          </CommandList>
          <div className="border-t px-4 py-2.5 text-[11px] text-muted-foreground">
            ↑ ↓ to browse · Enter to open · Esc to close · {audit.reference}
          </div>
        </Command>
      </CommandDialog>
    </>
  );
}
