'use client';
import { useEffect, useRef, useState, type RefObject } from 'react';
import type { SharingChoice } from './AuditSharingConsent';
import type { AuditLiveView, AuditPointer } from './live-types';
import { readPanelScroll } from './panel-scroll';
import { auditScrollContainer } from './scroll-container';
import { useLiveSocket } from './useLiveSocket';

export function useAuditBroadcast({
  organizationId,
  choice,
  root,
  view,
  paused,
}: {
  organizationId: string;
  choice: SharingChoice | null;
  root: RefObject<HTMLDivElement | null>;
  view: AuditLiveView | null;
  paused: boolean;
}) {
  const latest = useRef(view);
  latest.current = view;
  const lastPointer = useRef<AuditPointer>({ x: 0, y: 0, visible: false });
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const handleVisibility = () => setVisible(document.visibilityState === 'visible');
    handleVisibility();
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);
  const { send, connected } = useLiveSocket({
    organizationId,
    mode: 'publish',
    nonce: choice?.nonce,
    enabled: !!choice?.allowed && !paused && visible,
  });
  useEffect(() => {
    if (!connected) return;
    const publishView = () => {
      if (!latest.current || document.visibilityState !== 'visible') return;
      const scrolling = auditScrollContainer(root.current);
      const range = scrolling ? scrolling.scrollHeight - scrolling.clientHeight : 0;
      send({
        kind: 'view',
        view: {
          ...latest.current,
          panelScroll: readPanelScroll(),
          scrollRatio: range > 0 ? scrolling!.scrollTop / range : 0,
        },
      });
    };
    publishView();
    let lastScroll = 0;
    const handleScroll = () => {
      if (Date.now() - lastScroll > 100) {
        lastScroll = Date.now();
        publishView();
      }
    };
    document.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    const pointerTimer = setInterval(
      () => send({ kind: 'pointer', pointer: lastPointer.current }),
      1000,
    );
    const timer = setInterval(publishView, 1000);
    return () => {
      clearInterval(timer);
      clearInterval(pointerTimer);
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, [
    connected,
    root,
    send,
    view?.auditId,
    view?.tab,
    view?.checkId,
    view?.evidenceId,
    view?.compareEvidenceId,
    view?.checkLayout,
    view?.revision,
  ]);
  useEffect(() => {
    if (!connected || !root.current) return;
    let lastSent = 0;
    const handlePointer = (event: PointerEvent) => {
      if (Date.now() - lastSent < 50) return;
      lastSent = Date.now();
      const anchor =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>('[data-audit-live-target]')
          : null;
      const bounds = (anchor ?? root.current)?.getBoundingClientRect();
      if (!bounds || bounds.width <= 0 || bounds.height <= 0) return;
      const x = (event.clientX - bounds.left) / bounds.width;
      const y = (event.clientY - bounds.top) / bounds.height;
      lastPointer.current = {
        x: Math.max(0, Math.min(1, x)),
        y: Math.max(0, Math.min(1, y)),
        visible: x >= 0 && x <= 1 && y >= 0 && y <= 1,
        ...(anchor?.dataset.auditLiveTarget ? { anchor: anchor.dataset.auditLiveTarget } : {}),
      };
      send({ kind: 'pointer', pointer: lastPointer.current });
    };
    const hide = () => {
      lastPointer.current = { x: 0, y: 0, visible: false };
      send({ kind: 'pointer', pointer: lastPointer.current });
    };
    document.addEventListener('pointermove', handlePointer, { passive: true });
    document.addEventListener('pointerleave', hide);
    window.addEventListener('blur', hide);
    return () => {
      document.removeEventListener('pointermove', handlePointer);
      document.removeEventListener('pointerleave', hide);
      window.removeEventListener('blur', hide);
    };
  }, [connected, root, send]);
}
