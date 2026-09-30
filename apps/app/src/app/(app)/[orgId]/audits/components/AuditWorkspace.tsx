'use client';
import { usePermissions } from '@/hooks/use-permissions';
import { PageLayout } from '@trycompai/design-system';
import { useEffect, useRef, useState } from 'react';
import { AuditFollowBar } from '../live/AuditFollowBar';
import { AuditSharingConsent, type SharingChoice } from '../live/AuditSharingConsent';
import type { AuditLiveView } from '../live/live-types';
import { applyPanelScroll } from '../live/panel-scroll';
import { RemotePointer } from '../live/RemotePointer';
import { auditScrollContainer } from '../live/scroll-container';
import { useAuditBroadcast } from '../live/useAuditBroadcast';
import { useAuditObserver } from '../live/useAuditObserver';
import { useAuditDraftGuard } from '../useAuditDraftGuard';
import { useAuditWorkspace } from '../useAuditWorkspace';
import { auditRevision, nextCheck, type WorkspaceData } from '../workspace-types';
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
  const [choice, setChoice] = useState<SharingChoice | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sharingPaused, setSharingPaused] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const canObserve = hasPermission('auditWorkspace', 'observe');
  const observer = useAuditObserver({ organizationId, enabled: canObserve && choice !== null });
  const canEdit = hasPermission('auditWorkspace', 'update') && !observer.following;
  const [focusedFinding, setFocusedFinding] = useState<{ id: string } | null>(null);
  const [compareId, setCompareId] = useState<string | null>(null);
  const [checkLayout, setCheckLayout] = useState<'list' | 'board'>('board');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [auditId, setAuditId] = useState(initialData?.audits[0]?.id ?? '');
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<AuditLiveView['tab']>('checks');
  const [busy, setBusy] = useState(false);
  useAuditDraftGuard(busy);
  const audit = data?.audits.find((a) => a.id === auditId) ?? data?.audits[0];
  const check = audit?.controls.find((c) => c.id === selected);
  const registerUrl = `/${organizationId}/documents/isms/internal-audit`;
  const live = observer.current?.view;
  useEffect(() => {
    if (observer.following && live?.revision) void mutate();
  }, [observer.following, live?.revision, mutate]);
  useEffect(() => {
    if (!live) return;
    setAuditId(live.auditId);
    setSelected(live.checkId);
    setTab(live.tab);
    setPreviewId(live.evidenceId);
    setCompareId(live.compareEvidenceId ?? null);
    setCheckLayout(live.checkLayout ?? 'list');
    // Let the selected view and any portalled reader mount before restoring scroll positions.
    const frame = requestAnimationFrame(() => {
      const scrolling = auditScrollContainer(root.current);
      if (scrolling)
        scrolling.scrollTop =
          live.scrollRatio * Math.max(0, scrolling.scrollHeight - scrolling.clientHeight);
      applyPanelScroll(live.panelScroll);
    });
    return () => cancelAnimationFrame(frame);
  }, [live]);
  useAuditBroadcast({
    organizationId,
    choice,
    root,
    paused: sharingPaused || !!observer.following || settingsOpen,
    view: audit
      ? {
          auditId: audit.id,
          tab,
          checkId: selected,
          evidenceId: previewId,
          compareEvidenceId: compareId,
          checkLayout,
          scrollRatio: 0,
          revision: auditRevision(audit),
        }
      : null,
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
      maxWidth="2xl"
      header={
        <AuditWorkspaceHeader
          audit={audit}
          disabled={locked || choice === null || settingsOpen}
          registerUrl={registerUrl}
          onNavigate={(item) => {
            setCompareId(null);
            setFocusedFinding(item.group === 'Findings' ? item : null);
            setSelected(item.checkId);
            setPreviewId(item.evidenceId);
            setTab(item.tab);
          }}
          onSettings={() => {
            setSharingPaused(true);
            setSettingsOpen(true);
          }}
        />
      }
    >
      {canObserve && <AuditFollowBar observer={observer} disabled={busy} />}
      <div ref={root} className="relative space-y-6">
        <AuditSharingConsent
          organizationId={organizationId}
          open={choice === null || settingsOpen}
          onPause={() => setSharingPaused(true)}
          onChoice={(value) => {
            setChoice(value);
            setSharingPaused(false);
            setSettingsOpen(false);
          }}
        />
        {observer.following && observer.current && (
          <RemotePointer position={observer.pointer} root={root} name={observer.current.name} />
        )}
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
    </PageLayout>
  );
}
