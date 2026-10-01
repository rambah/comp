import { Button, PageHeader, PageHeaderDescription } from '@trycompai/design-system';
import { ArrowRight } from '@trycompai/design-system/icons';
import Link from 'next/link';
import type { AuditSearchItem } from '../audit-search';
import type { WorkspaceAudit } from '../workspace-types';
import { AuditSearch } from './AuditSearch';

export function AuditWorkspaceHeader({
  audit,
  disabled,
  onNavigate,
  registerUrl,
  recordingsUrl,
}: {
  audit: WorkspaceAudit | undefined;
  disabled: boolean;
  onNavigate: (item: AuditSearchItem) => void;
  registerUrl: string;
  recordingsUrl?: string;
}) {
  return (
    <div className="flex flex-col gap-5 pb-1 pt-2 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0 space-y-2">
        <p className="audit-eyebrow">Assurance / Internal audits</p>
        <PageHeader title="Audit workspace">
          <PageHeaderDescription>
            A clear view of your evidence. A confident next step.
          </PageHeaderDescription>
        </PageHeader>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {recordingsUrl && (
          <div data-audit-live-private>
            <Button variant="outline" render={<Link href={recordingsUrl} />}>
              Recordings
            </Button>
          </div>
        )}
        {audit && <AuditSearch audit={audit} disabled={disabled} onNavigate={onNavigate} />}
        <Button
          variant="ghost"
          iconRight={<ArrowRight size={16} />}
          render={<Link href={registerUrl} />}
        >
          Audit programme
        </Button>
      </div>
    </div>
  );
}
