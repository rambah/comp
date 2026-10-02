'use client';
import { AttachmentFeedbackQueue } from '@/components/attachments/feedback/AttachmentFeedbackQueue';
import { usePermissions } from '@/hooks/use-permissions';
import { PageLayout } from '@trycompai/design-system';
import { useMemo, useState, useSyncExternalStore } from 'react';
import '../audit-workspace.css';
import { AuditDomReplay } from '../live/AuditDomReplay';
import { AuditFollowBar } from '../live/AuditFollowBar';
import { useAuditLiveObserver } from '../live/AuditLiveProvider';
import { AuditResearch } from '../research/AuditResearch';
import { useAuditDraftGuard } from '../useAuditDraftGuard';
import { useAuditNavigation } from '../useAuditNavigation';
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
import { AuditSourceCatalog } from './AuditSourceCatalog';
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
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false,
  );
  const canObserve = hydrated && hasPermission('auditWorkspace', 'observe');
  const observer = useAuditLiveObserver();
  const canEdit = hydrated && hasPermission('auditWorkspace', 'update') && !observer.following;
  const {
    auditId,
    tab,
    checkId: selected,
    evidenceId: previewId,
    compareId,
    findingId,
    checkLayout,
    threadId: researchThread,
    sourceKey: researchSource,
    navigate,
  } = useAuditNavigation({ defaultAuditId: data?.audits[0]?.id ?? '' });
  const focusedFinding = useMemo(() => (findingId ? { id: findingId } : null), [findingId]);
  const [busy, setBusy] = useState(false);
  useAuditDraftGuard(busy);
  const audit = data?.audits.find((a) => a.id === auditId) ?? data?.audits[0];
  const check = audit?.controls.find((c) => c.id === selected);
  const registerUrl = `/${organizationId}/documents/isms/internal-audit`;
  const locked = busy || !!observer.following;
  const handleSelect = (id: string) => {
    if (!locked) {
      navigate({ compareId: null, checkId: id, evidenceId: null, tab: 'checks' });
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
          recordingsUrl={
            canObserve && hasPermission('auditRecording', 'read')
              ? `/${organizationId}/audits/recordings`
              : undefined
          }
          onNavigate={(item) => {
            navigate({
              compareId: null,
              findingId: item.group === 'Findings' ? item.id : null,
              checkId: item.checkId,
              evidenceId: item.evidenceId,
              tab: item.tab,
            });
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
                  navigate({
                    auditId: id,
                    compareId: null,
                    threadId: null,
                    sourceKey: null,
                    checkId: null,
                    evidenceId: null,
                    findingId: null,
                  });
                }}
              />
              <AuditWorkspaceTabs
                audit={audit}
                tab={tab}
                locked={locked}
                onChange={(value) => {
                  navigate({
                    tab: value,
                    checkId: null,
                    evidenceId: null,
                    compareId: null,
                    findingId: null,
                  });
                }}
              />
              {tab === 'sources' && <AuditSourceCatalog organizationId={organizationId} />}
              {tab === 'research' && (
                <AuditResearch
                  key={audit.id}
                  organizationId={organizationId}
                  auditId={audit.id}
                  canEdit={canEdit}
                  following={!!observer.following}
                  threadId={researchThread}
                  sourceKey={researchSource}
                  onThread={(threadId) => navigate({ threadId })}
                  onSource={(sourceKey) => navigate({ sourceKey })}
                />
              )}
              {tab === 'evidence' && (
                <AuditEvidenceLibrary
                  key={audit.id}
                  audit={audit}
                  organizationId={organizationId}
                  locked={locked}
                  onSources={() => {
                    if (!locked) navigate({ tab: 'sources' });
                  }}
                  previewId={previewId}
                  compareId={compareId}
                  onSelect={handleSelect}
                  onPreview={(id, comparison = null) => {
                    if (!locked) {
                      navigate({ evidenceId: id, compareId: comparison });
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
                      onBack={() => navigate({ checkId: null, evidenceId: null })}
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
                      onPreviewChange={(evidenceId) => navigate({ evidenceId })}
                      onRefresh={mutate}
                      onBusyChange={setBusy}
                      onComplete={() => {
                        const next = nextCheck({
                          ...audit,
                          controls: audit.controls.filter((c) => c.id !== check.id),
                        });
                        navigate({ checkId: next?.id ?? null, evidenceId: null });
                      }}
                    />
                  </div>
                ) : (
                  <AuditQueue
                    layout={checkLayout}
                    onLayoutChange={(value) => {
                      if (!locked) navigate({ checkLayout: value });
                    }}
                    audit={audit}
                    onSelect={handleSelect}
                    onRequests={() => {
                      if (!locked) navigate({ tab: 'requests' });
                    }}
                    onReport={() => {
                      if (!locked) navigate({ tab: 'report' });
                    }}
                    onEvidence={() => {
                      if (!locked) navigate({ tab: 'evidence' });
                    }}
                  />
                ))}
              {tab === 'requests' && (
                <div className="space-y-8">
                  <AttachmentFeedbackQueue organizationId={organizationId} canEdit={canEdit} />
                  <AuditRequests
                    audit={audit}
                    members={data.members}
                    canEdit={canEdit}
                    update={update}
                    onSelect={handleSelect}
                  />
                </div>
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
                    navigate({ tab: 'checks', checkId: null, evidenceId: null });
                  }}
                  onRequests={() => {
                    if (!locked) navigate({ tab: 'requests' });
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
