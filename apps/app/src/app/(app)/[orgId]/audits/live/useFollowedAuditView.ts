import { useEffect, type RefObject } from 'react';
import type { AuditLiveView } from './live-types';
import { applyPanelScroll } from './panel-scroll';
import { auditScrollContainer } from './scroll-container';
export function useFollowedAuditView({
  live,
  following,
  mutate,
  root,
  setAuditId,
  setSelected,
  setTab,
  setPreviewId,
  setCompareId,
  setCheckLayout,
}: {
  live: AuditLiveView | undefined;
  following: boolean;
  mutate: () => Promise<unknown>;
  root: RefObject<HTMLDivElement | null>;
  setAuditId: (id: string) => void;
  setSelected: (id: string | null) => void;
  setTab: (tab: AuditLiveView['tab']) => void;
  setPreviewId: (id: string | null) => void;
  setCompareId: (id: string | null) => void;
  setCheckLayout: (layout: 'board' | 'list') => void;
}) {
  useEffect(() => {
    if (following && live?.revision) void mutate();
  }, [following, live?.revision, mutate]);
  useEffect(() => {
    if (!live) return;
    setAuditId(live.auditId);
    setSelected(live.checkId);
    setTab(live.tab);
    setPreviewId(live.evidenceId);
    setCompareId(live.compareEvidenceId ?? null);
    setCheckLayout(live.checkLayout ?? 'list');
    const frame = requestAnimationFrame(() => {
      const scrolling = auditScrollContainer(root.current);
      if (scrolling)
        scrolling.scrollTop =
          live.scrollRatio * Math.max(0, scrolling.scrollHeight - scrolling.clientHeight);
      applyPanelScroll(live.panelScroll);
    });
    return () => cancelAnimationFrame(frame);
  }, [live, root, setAuditId, setSelected, setTab, setPreviewId, setCompareId, setCheckLayout]);
}
