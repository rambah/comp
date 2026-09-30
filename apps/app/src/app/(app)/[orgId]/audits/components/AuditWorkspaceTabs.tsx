import { Tabs, TabsList, TabsTrigger } from '@trycompai/design-system';
import {
  Chat,
  Document,
  Flag,
  List,
  Report,
  WatsonHealthAiResults,
} from '@trycompai/design-system/icons';
import type { AuditLiveView } from '../live/live-types';
import type { WorkspaceAudit } from '../workspace-types';
export function AuditWorkspaceTabs({
  audit,
  tab,
  locked,
  onChange,
}: {
  audit: WorkspaceAudit;
  tab: AuditLiveView['tab'];
  locked: boolean;
  onChange: (tab: AuditLiveView['tab']) => void;
}) {
  const requests = audit.controls
    .flatMap((c) => c.requests)
    .filter((r) => r.status !== 'accepted').length;
  const tabs = [
    { key: 'checks', label: 'Review plan', icon: List, count: null },
    { key: 'evidence', label: 'Evidence library', icon: Document, count: null },
    { key: 'requests', label: 'Requests', icon: Chat, count: requests || null },
    { key: 'findings', label: 'Findings', icon: Flag, count: audit.findings.length || null },
    { key: 'research', label: 'Research AI', icon: WatsonHealthAiResults, count: null },
    { key: 'report', label: 'Audit report', icon: Report, count: null },
  ] as const;
  return (
    <div className="audit-surface min-w-0 overflow-hidden px-2 pt-1">
      <Tabs
        value={tab}
        onValueChange={(value) => {
          if (!locked && tabs.some((t) => t.key === value)) onChange(value as AuditLiveView['tab']);
        }}
      >
        <TabsList aria-label="Audit workspace">
          {tabs.map(({ key, label, icon: Icon, count }) => (
            <TabsTrigger key={key} value={key} disabled={locked}>
              <span className="flex items-center gap-2 py-1">
                <Icon size={16} />
                {label}
                {count !== null && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums">
                    {count}
                  </span>
                )}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}
