'use client';
import { usePermissions } from '@/hooks/use-permissions';
import { PageLayout } from '@trycompai/design-system';
import { useState, useSyncExternalStore } from 'react';
import '../audit-workspace.css';
import { AuditDomReplay } from '../live/AuditDomReplay';
import { AuditFollowBar } from '../live/AuditFollowBar';
import type { AuditLiveView } from '../live/live-types';
import { useAuditDomBroadcast } from '../live/useAuditDomBroadcast';
import { useAuditDomObserver } from '../live/useAuditDomObserver';
import { useAuditSharing } from '../live/useAuditSharing';
import { AuditResearch } from '../research/AuditResearch';
import { useAuditDraftGuard } from '../useAuditDraftGuard';
import { useAuditWorkspace } from '../useAuditWorkspace';
import { nextCheck, type WorkspaceData } from '../workspace-types';
import { AuditCheckDetail } from './AuditCheckDetail';
import { AuditCheckNavigator } from './AuditCheckNavigator';
import { AuditContext } from './AuditContext';
import { AuditEvidenceLibrary } from './AuditEvidenceLibrary';
import { AuditFindings } from './AuditFindings';
import { AuditQueue } from './AuditQueue';
import { AuditReport } from './AuditReport';
import { AuditRequests } from './AuditRequests';
import { AuditWorkspaceHeader } from './AuditWorkspaceHeader';
import { AuditWorkspaceState } from './AuditWorkspaceState';
import { AuditWorkspaceTabs } from './AuditWorkspaceTabs';

const subscribeHydration = () => () => {};

export function AuditWorkspace({
  organizationId,
  initialData,
}: {
  organizationId: string;
  initialData: WorkspaceData | null;
}) {
  const { data, error, isLoading, mutate, update } = useAuditWorkspace({
    organizationId,
    initialData,
  });
  const { hasPermission } = usePermissions();
  const sharingSession = useAuditSharing(organizationId);
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false,
  );
  const canObserve = hydrated && hasPermission('auditWorkspace', 'observe');
  const observer = useAuditDomObserver({ organizationId, enabled: canObserve });
  const canEdit = hydrated && hasPermission('auditWorkspace', 'update') && !observer.following;
  const [focusedFinding, setFocusedFinding] = useState<{ id: string } | null>(null);
  const [compareId, setCompareId] = useState<string | null>(null);
  const [checkLayout, setCheckLayout] = useState<'list' | 'board'>('board');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [auditId, setAuditId] = useState(initialData?.audits[0]?.id ?? '');
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<AuditLiveView['tab']>('checks');
  const [researchThread, setResearchThread] = useState<string | null>(null);
  const [researchSource, setResearchSource] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useAuditDraftGuard(busy);
  const audit = data?.audits.find((a) => a.id === auditId) ?? data?.audits[0];
  const check = audit?.controls.find((c) => c.id === selected);
  const registerUrl = `/${organizationId}/documents/isms/internal-audit`;
  useAuditDomBroadcast({
    organizationId,
    session: observer.following ? null : sharingSession.session,
  });
  const locked = busy || !!observer.following;
  const handleSelect = (id: string) => {
    if (!locked) {
      setCompareId(null);
      setSelected(id);
      setPreviewId(null);
      setTab('checks');
    }
  };
  return (
    <PageLayout
      data-audit-workspace
      padding="lg"
      maxWidth="2xl"
      header={
        <AuditWorkspaceHeader
          audit={audit}
          disabled={locked}
          registerUrl={registerUrl}
          onNavigate={(item) => {
            setCompareId(null);
            setFocusedFinding(item.group === 'Findings' ? item : null);
            setSelected(item.checkId);
            setPreviewId(item.evidenceId);
            setTab(item.tab);
          }}
        />
      }
    >
      {canObserve && <AuditFollowBar observer={observer} disabled={busy} />}
      {observer.following ? (
        <AuditDomReplay observer={observer} organizationId={organizationId} />
      ) : (
        <div className="relative space-y-6">
          <AuditWorkspaceState
            loading={isLoading && !data}
            error={!!error}
            empty={!!data && !audit}
            registerUrl={registerUrl}
            onRetry={() => void mutate()}
          />
          {audit && data && (
            <>
              <AuditContext
                audit={audit}
                audits={data.audits}
                locked={locked}
                canEdit={canEdit}
                onChange={(id) => {
                  setCompareId(null);
                  setAuditId(id);
                  setResearchThread(null);
                  setResearchSource(null);
                  setSelected(null);
                  setPreviewId(null);
                }}
              />
              <AuditWorkspaceTabs
                audit={audit}
                tab={tab}
                locked={locked}
                onChange={(value) => {
                  setTab(value);
                  setSelected(null);
                  setPreviewId(null);
                  setCompareId(null);
                }}
              />
              {tab === 'research' && (
                <AuditResearch
                  key={audit.id}
                  organizationId={organizationId}
                  auditId={audit.id}
                  canEdit={canEdit}
                  following={!!observer.following}
                  threadId={researchThread}
                  sourceKey={researchSource}
                  onThread={setResearchThread}
                  onSource={setResearchSource}
                />
              )}
              {tab === 'evidence' && (
                <AuditEvidenceLibrary
                  key={audit.id}
                  audit={audit}
                  organizationId={organizationId}
                  locked={locked}
                  previewId={previewId}
                  compareId={compareId}
                  onSelect={handleSelect}
                  onPreview={(id, comparison = null) => {
                    if (!locked) {
                      setPreviewId(id);
                      setCompareId(comparison);
                    }
                  }}
                />
              )}
              {tab === 'checks' &&
                (check ? (
                  <div className="space-y-5">
                    <AuditCheckNavigator
                      audit={audit}
                      selected={check.id}
                      locked={locked}
                      onSelect={handleSelect}
                      onBack={() => setSelected(null)}
                    />
                    <AuditCheckDetail
                      key={check.id}
                      check={check}
                      audit={audit}
                      organizationId={organizationId}
                      members={data.members}
                      canEdit={canEdit}
                      update={update}
                      previewId={previewId}
                      onPreviewChange={setPreviewId}
                      onRefresh={mutate}
                      onBusyChange={setBusy}
                      onComplete={() => {
                        setPreviewId(null);
                        const next = nextCheck({
                          ...audit,
                          controls: audit.controls.filter((c) => c.id !== check.id),
                        });
                        setSelected(next?.id ?? null);
                      }}
                    />
                  </div>
                ) : (
                  <AuditQueue
                    layout={checkLayout}
                    onLayoutChange={(value) => {
                      if (!locked) setCheckLayout(value);
                    }}
                    audit={audit}
                    onSelect={handleSelect}
                    onRequests={() => {
                      if (!locked) setTab('requests');
                    }}
                    onReport={() => {
                      if (!locked) setTab('report');
                    }}
                    onEvidence={() => {
                      if (!locked) setTab('evidence');
                    }}
                  />
                ))}
              {tab === 'requests' && (
                <AuditRequests
                  audit={audit}
                  members={data.members}
                  canEdit={canEdit}
                  update={update}
                  onSelect={handleSelect}
                />
              )}
              {tab === 'findings' && (
                <AuditFindings
                  focus={focusedFinding}
                  audit={audit}
                  members={data.members}
                  canEdit={canEdit}
                  update={update}
                  onSelect={handleSelect}
                  registerUrl={registerUrl}
                />
              )}
              {tab === 'report' && (
                <AuditReport
                  onChecks={() => {
                    setTab('checks');
                    setSelected(null);
                  }}
                  onRequests={() => {
                    if (!locked) setTab('requests');
                  }}
                  onBusyChange={setBusy}
                  audit={audit}
                  members={data.members}
                  canEdit={canEdit}
                  update={update}
                  registerUrl={registerUrl}
                />
              )}
            </>
          )}
        </div>
      )}
    </PageLayout>
  );
}
