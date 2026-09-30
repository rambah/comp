'use client';
import { usePermissions } from '@/hooks/use-permissions';
import {
  Badge,
  Button,
  PageHeader,
  PageLayout,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsList,
  TabsTrigger,
  Text,
} from '@trycompai/design-system';
import { ArrowLeft, Launch } from '@trycompai/design-system/icons';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { AuditFollowBar } from '../live/AuditFollowBar';
import { AuditSharingConsent, type SharingChoice } from '../live/AuditSharingConsent';
import type { AuditLiveView } from '../live/live-types';
import { RemotePointer } from '../live/RemotePointer';
import { auditScrollContainer } from '../live/scroll-container';
import { useAuditBroadcast } from '../live/useAuditBroadcast';
import { useAuditObserver } from '../live/useAuditObserver';
import { useAuditDraftGuard } from '../useAuditDraftGuard';
import { useAuditWorkspace } from '../useAuditWorkspace';
import { auditRevision, formatAuditDate, nextCheck, type WorkspaceData } from '../workspace-types';
import { AuditCheckDetail } from './AuditCheckDetail';
import { AuditFindings } from './AuditFindings';
import { AuditQueue } from './AuditQueue';
import { AuditReport } from './AuditReport';
import { AuditRequests } from './AuditRequests';

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
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [auditId, setAuditId] = useState(initialData?.audits[0]?.id ?? '');
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<AuditLiveView['tab']>('checks');
  const [busy, setBusy] = useState(false);
  useAuditDraftGuard(busy);
  const audit = data?.audits.find((a) => a.id === auditId) ?? data?.audits[0];
  const check = audit?.controls.find((c) => c.id === selected);
  const requests = audit?.controls.flatMap((c) => c.requests) ?? [];
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
    const scrolling = auditScrollContainer(root.current);
    if (scrolling)
      scrolling.scrollTop = live.scrollRatio * (scrolling.scrollHeight - scrolling.clientHeight);
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
          scrollRatio: 0,
          revision: auditRevision(audit),
        }
      : null,
  });
  const locked = busy || !!observer.following;
  const handleSelect = (id: string) => {
    if (!locked) {
      setSelected(id);
      setPreviewId(null);
      setTab('checks');
    }
  };
  return (
    <PageLayout
      header={
        <PageHeader
          title="Audits"
          actions={
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setSharingPaused(true);
                  setSettingsOpen(true);
                }}
              >
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
        {error && (
          <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border p-4">
            <Text>Unable to refresh the audit workspace.</Text>
            <Button variant="outline" onClick={() => void mutate()}>
              Try again
            </Button>
          </div>
        )}
        {isLoading && !data && <Text variant="muted">Loading audits…</Text>}
        {data && !audit && (
          <div className="space-y-4 rounded-lg border p-8">
            <Text weight="medium">No internal audit has been planned yet.</Text>
            <Text variant="muted">
              Create an audit in the existing audit programme. Its checks and findings will appear
              here.
            </Text>
            <Button render={<Link href={registerUrl} target="_blank" rel="noopener noreferrer" />}>
              Open audit programme
            </Button>
          </div>
        )}
        {audit && data && (
          <>
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-52">
                    <Select
                      value={audit.id}
                      disabled={locked}
                      onValueChange={(v) => {
                        setAuditId(v ?? '');
                        setSelected(null);
                        setPreviewId(null);
                      }}
                    >
                      <SelectTrigger aria-label="Select audit">
                        <SelectValue>{audit.reference}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {data.audits.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.reference}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Badge variant="secondary">{audit.status.replaceAll('_', ' ')}</Badge>
                </div>
                <Text size="sm" variant="muted">
                  {audit.auditorName || 'Auditor not assigned'} ·{' '}
                  {formatAuditDate(audit.plannedStartDate)} –{' '}
                  {formatAuditDate(audit.plannedEndDate)}
                </Text>
              </div>
              {!canEdit && <Badge variant="outline">Read-only access</Badge>}
            </div>
            <Tabs
              value={tab}
              onValueChange={(v) => {
                if (!locked) {
                  setTab(v as AuditLiveView['tab']);
                  setSelected(null);
                  setPreviewId(null);
                }
              }}
            >
              <TabsList aria-label="Audit workspace">
                <TabsTrigger value="checks" disabled={locked}>
                  Checks
                </TabsTrigger>
                <TabsTrigger value="requests" disabled={locked}>
                  Requests ({requests.filter((r) => r.status !== 'accepted').length})
                </TabsTrigger>
                <TabsTrigger value="findings" disabled={locked}>
                  Findings ({audit.findings.length})
                </TabsTrigger>
                <TabsTrigger value="report" disabled={locked}>
                  Report
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {tab === 'checks' &&
              (check ? (
                <div className="space-y-5">
                  <Button
                    variant="ghost"
                    disabled={locked}
                    iconLeft={<ArrowLeft size={16} />}
                    onClick={() => setSelected(null)}
                  >
                    All checks
                  </Button>
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
                <AuditQueue audit={audit} onSelect={handleSelect} />
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
