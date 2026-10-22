'use client';

import { usePermissions } from '@/hooks/use-permissions';
import { Input } from '@trycompai/design-system';
import { ArrowRight } from '@trycompai/design-system/icons';
import Link from 'next/link';
import { useState } from 'react';
import { AUDIT_SOURCE_LOCATIONS } from '../audit-source-catalog';
import { AuditSectionHeading } from './AuditPresentation';

export function AuditSourceCatalog({ organizationId }: { organizationId: string }) {
  const { hasPermission } = usePermissions();
  const [search, setSearch] = useState('');
  const sources = AUDIT_SOURCE_LOCATIONS.filter(
    (source) =>
      (hasPermission(source.permission, 'read') ||
        (source.path === 'tasks' && hasPermission('task', 'read'))) &&
      `${source.title} ${source.description}`.toLowerCase().includes(search.trim().toLowerCase()),
  );
  return (
    <section className="min-w-0 space-y-6">
      <AuditSectionHeading
        eyebrow="Audit sources"
        title="Your records, ready to inspect."
        description="Open the current registers and documents, including records that have not yet been linked to an audit check. Browser Back returns to this workspace."
      />
      <div className="audit-surface space-y-2 p-5 text-sm leading-6 text-muted-foreground">
        <p>
          Each source shows its own status and available published versions. A working draft can
          differ from the last approved version.
        </p>
        <p>
          The review plan contains the selected audit checks. Use the audit scope, criteria and
          these sources to assess coverage; the check count alone does not establish completeness.
        </p>
      </div>
      <Input
        aria-label="Find an audit source"
        placeholder="Find risks, vendors, policies, a clause or document…"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      {(['Registers & evidence', 'ISMS documents'] as const).map((group) => {
        const items = sources.filter((source) => source.group === group);
        if (!items.length) return null;
        return (
          <section key={group} className="space-y-3" aria-label={group}>
            <h3 className="text-base font-semibold">{group}</h3>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {items.map((source) => (
                <Link
                  key={source.path}
                  href={`/${organizationId}/${source.path}`}
                  className="audit-card flex min-w-0 items-start gap-3 p-5 transition-colors hover:border-primary/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <div className="min-w-0 flex-1">
                    <h4 className="break-words font-medium">{source.title}</h4>
                    <p className="mt-2 break-words text-sm leading-6 text-muted-foreground">
                      {source.description}
                    </p>
                  </div>
                  <ArrowRight size={18} className="mt-1 shrink-0 text-primary" />
                </Link>
              ))}
            </div>
          </section>
        );
      })}
      {!sources.length && (
        <p className="text-sm text-muted-foreground">No accessible sources match this search.</p>
      )}
    </section>
  );
}
