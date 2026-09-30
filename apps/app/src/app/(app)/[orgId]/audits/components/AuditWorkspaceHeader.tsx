import { Button, PageHeader, PageHeaderDescription } from '@trycompai/design-system';
import { Launch } from '@trycompai/design-system/icons';
import Link from 'next/link';
import type { AuditSearchItem } from '../audit-search';
import type { WorkspaceAudit } from '../workspace-types';
import { AuditSearch } from './AuditSearch';
export function AuditWorkspaceHeader({
  audit,
  disabled,
  onNavigate,
  onSettings,
  registerUrl,
}: {
  audit: WorkspaceAudit | undefined;
  disabled: boolean;
  onNavigate: (item: AuditSearchItem) => void;
  onSettings: () => void;
  registerUrl: string;
}) {
  return (
    <PageHeader
      title="Audit workspace"
      actions={
        <div className="flex flex-wrap gap-2">
          {audit && <AuditSearch audit={audit} disabled={disabled} onNavigate={onNavigate} />}
          <Button variant="ghost" onClick={onSettings}>
            Audit settings
          </Button>
          <Button
            variant="outline"
            iconRight={<Launch size={16} />}
            render={<Link href={registerUrl} target="_blank" rel="noopener noreferrer" />}
          >
            Audit programme
          </Button>
        </div>
      }
    >
      <PageHeaderDescription>
        Evidence, conversations and conclusions. One focused place to run your audit.
      </PageHeaderDescription>
    </PageHeader>
  );
}
