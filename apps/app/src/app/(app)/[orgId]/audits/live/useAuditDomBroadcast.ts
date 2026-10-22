'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { eventWithTime } from 'rrweb';
import { encodeBatch } from './dom-codec';
import { auditBlockSelector, currentPdf } from './dom-privacy';
import type { AuditLiveEvent } from './live-types';
import type { AuditSharingSession } from './useAuditSharing';
import { useLiveSocket } from './useLiveSocket';
import { isActiveAuditTab } from './active-audit-tab';

export function useAuditDomBroadcast({
  organizationId,
  session,
}: {
  organizationId: string;
  session: AuditSharingSession | null;
}) {
  const watchers = useRef(new Map<string, { name: string; at: number }>());
  const [viewers, setViewers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const snapshot = useRef<(() => void) | null>(null);
  const handleEvent = useCallback((event: AuditLiveEvent) => {
    if (event.kind !== 'watch') return;
    if (!event.watching) watchers.current.delete(event.nonce);
    else {
      const known = watchers.current.has(event.nonce);
      watchers.current.set(event.nonce, { name: event.name, at: Date.now() });
      if (!known || event.requestSnapshot) snapshot.current?.();
    }
    setViewers([...new Set([...watchers.current.values()].map((v) => v.name))]);
  }, []);
  const { connected, send } = useLiveSocket({
    organizationId,
    mode: 'publish',
    nonce: session?.nonce,
    enabled: !!session?.allowed,
    onEvent: handleEvent,
  });

  useEffect(() => {
    if (!connected || !session?.allowed) {
      watchers.current.clear();
      setViewers([]);
      return;
    }
    let disposed = false;
    const activeWatchers = watchers.current;
    let stop: (() => void) | undefined;
    let events: eventWithTime[] = [];
    let epoch = crypto.randomUUID();
    let batch = 0;
    let packing = false;
    let lastSnapshot = 0;
    let lastPdf = '';
    setError(null);
    const fail = () => {
      stop?.();
      events = [];
      setError(
        'Live view paused because it could not be synchronized. Stop sharing and start again.',
      );
    };
    void import('rrweb')
      .then(({ record }) => {
        if (disposed || !isActiveAuditTab()) return;
        snapshot.current = () => {
          if (Date.now() - lastSnapshot < 1000) return;
          lastSnapshot = Date.now();
          record.takeFullSnapshot(true);
        };
        stop = record({
          emit(event) {
            if (disposed || !isActiveAuditTab()) return;
            if (event.type === 4) {
              epoch = crypto.randomUUID();
              batch = 0;
              events = [];
            }
            events.push(event);
            if (events.length > 5000) fail();
          },
          blockSelector: auditBlockSelector,
          maskInputOptions: { password: true },
          maskTextSelector: '[data-audit-live-mask]',
          inlineStylesheet: true,
          inlineImages: true,
          recordCanvas: false,
          recordCrossOriginIframes: false,
          collectFonts: false,
          slimDOMOptions: {
            script: true,
            comment: true,
            headMetaDescKeywords: true,
            headMetaSocial: true,
            headMetaRobots: true,
            headMetaHttpEquiv: true,
            headMetaAuthorship: true,
            headMetaVerification: true,
          },
          sampling: { mousemove: 25, mousemoveCallback: 100, scroll: 50 },
          checkoutEveryNms: 30000,
        });
      })
      .catch(fail);
    const flush = setInterval(() => {
      if (disposed || packing || !isActiveAuditTab()) return;
      const pdf = currentPdf();
      if (!events.length && JSON.stringify(pdf) === lastPdf) return;
      const captured = { events, pdf };
      events = [];
      const currentEpoch = epoch;
      const currentBatch = batch++;
      lastPdf = JSON.stringify(pdf);
      packing = true;
      void encodeBatch(captured)
        .then((parts) => {
          if (disposed || !isActiveAuditTab()) return;
          for (let part = 0; part < parts.length; part++) {
            if (
              !send({
                kind: 'dom',
                epoch: currentEpoch,
                batch: currentBatch,
                part,
                parts: parts.length,
                payload: parts[part],
              })
            )
              break;
          }
        })
        .catch(fail)
        .finally(() => {
          packing = false;
        });
    }, 100);
    const presence = () => {
      if (!isActiveAuditTab()) return;
      send({ kind: 'presence' });
      for (const [key, viewer] of watchers.current)
        if (Date.now() - viewer.at > 12000) watchers.current.delete(key);
      setViewers([...new Set([...watchers.current.values()].map((v) => v.name))]);
    };
    presence();
    const timer = setInterval(presence, 2000);
    return () => {
      disposed = true;
      snapshot.current = null;
      stop?.();
      events = [];
      activeWatchers.clear();
      clearInterval(flush);
      clearInterval(timer);
    };
  }, [connected, send, session?.allowed, session?.nonce]);
  return { connected, viewers, error };
}
