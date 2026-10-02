'use client';
import { Button } from '@trycompai/design-system';
import { useEffect, useRef, useState } from 'react';
import type { Replayer } from 'rrweb';
import 'rrweb/dist/style.css';
import { AuditPdfPreview } from '../components/AuditPdfPreview';
import type { PdfReference } from './dom-codec';
import type { useAuditDomObserver } from './useAuditDomObserver';

export function AuditDomReplay({
  observer,
  organizationId,
}: {
  observer: ReturnType<typeof useAuditDomObserver>;
  organizationId: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [pdf, setPdf] = useState<PdfReference>(null);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [fullscreenError, setFullscreenError] = useState(false);
  useEffect(() => {
    const handleChange = () => setExpanded(document.fullscreenElement === container.current);
    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, []);
  const handleFullscreen = async () => {
    setFullscreenError(false);
    try {
      if (document.fullscreenElement === container.current) await document.exitFullscreen();
      else await container.current?.requestFullscreen();
    } catch {
      setFullscreenError(true);
    }
  };
  useEffect(() => {
    let disposed = false;
    let replay: Replayer | null = null;
    let previous: Replayer | null = null;
    let width = 1280;
    let height = 800;
    let offset = 0;
    let previousOffset = 0;
    const resize = () => {
      if (!stage.current || !container.current || !replay) return;
      const scale = Math.min(1, container.current.clientWidth / width);
      replay.wrapper.style.transformOrigin = 'top left';
      replay.wrapper.style.transform = `scale(${scale})`;
      stage.current.style.height = `${height * scale}px`;
    };
    const clear = () => {
      replay?.destroy();
      previous?.destroy();
      replay = null;
      previous = null;
      setPdf(null);
    };
    observer.clearView.current = clear;
    const sizing = new ResizeObserver(resize);
    if (container.current) sizing.observe(container.current);
    void import('rrweb')
      .then(({ Replayer: Player, ReplayerEvents }) => {
        if (disposed) return;
        observer.consume.current = (batch, reset) => {
          if (!stage.current) return;
          if (reset) {
            previous?.destroy();
            previous = replay;
            previousOffset = offset;
            // Normalize publisher clock skew once per snapshot and keep a short motion buffer.
            offset = Date.now() - (batch.events[0]?.timestamp ?? Date.now());
            replay = new Player([], {
              root: stage.current,
              liveMode: true,
              // PageLayout fades in with CSS. Pausing animations freezes it at opacity 0.
              pauseAnimation: false,
              mouseTail: false,
              showWarning: false,
              showDebug: false,
              UNSAFE_replayCanvas: false,
            });
            replay.iframe.title = 'Live auditor view (read-only)';
            // Never mount the app here or grant scripts/forms: replay must not submit anything.
            replay.iframe.setAttribute('sandbox', 'allow-same-origin');
            replay.iframe.setAttribute('inert', '');
            replay.iframe.tabIndex = -1;
            replay.disableInteract();
            // Retain the last painted frame until the replacement snapshot is ready.
            // Replacing players bounds their event history without flashing an empty view.
            replay.wrapper.style.position = 'absolute';
            replay.wrapper.style.visibility = 'hidden';
            const replacement = replay;
            replay.on(ReplayerEvents.FullsnapshotRebuilded, () => {
              requestAnimationFrame(() => {
                if (disposed || replay !== replacement) return;
                previous?.destroy();
                previous = null;
                replacement.wrapper.style.visibility = 'visible';
                resize();
              });
            });
            replay.startLive(Date.now() - 800);
          }
          if (!replay) return;
          for (const event of batch.events) {
            if (event.type === 4) {
              width = event.data.width;
              height = event.data.height;
            }
            if (event.type === 3 && event.data.source === 4) {
              width = event.data.width;
              height = event.data.height;
            }
            replay.addEvent({ ...event, timestamp: event.timestamp + offset });
            previous?.addEvent({ ...event, timestamp: event.timestamp + previousOffset });
          }
          resize();
          setPdf(batch.pdf);
        };
      })
      .catch(() => setError(true));
    return () => {
      disposed = true;
      observer.consume.current = null;
      observer.clearView.current = null;
      sizing.disconnect();
      replay?.destroy();
      previous?.destroy();
    };
  }, [observer.consume, observer.clearView]);
  return (
    <section
      ref={container}
      data-audit-live-private
      className="audit-surface overflow-hidden bg-background"
    >
      <div className="flex items-center justify-between gap-4 border-b p-4">
        <div>
          <h2 className="font-medium">{observer.current?.name ?? 'Auditor'} · Live view</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Read-only · Changes appear with a short buffer for smooth movement.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void handleFullscreen()}>
          {expanded ? 'Exit full screen' : 'Expand view'}
        </Button>
      </div>
      {fullscreenError && (
        <p role="status" className="px-4 pb-4 text-sm text-muted-foreground">
          Full screen is unavailable. You can continue watching here.
        </p>
      )}
      {(!observer.ready || error) && (
        <p role="status" className="p-6 text-sm text-muted-foreground">
          {error
            ? 'The live viewer could not load. Please reload this page.'
            : !observer.connected
              ? 'Connection interrupted. Reconnecting…'
              : !observer.current
                ? 'Waiting for the auditor to reconnect…'
                : 'Synchronizing the live view…'}
        </p>
      )}
      <div ref={stage} className="relative overflow-hidden" />
      {pdf && (
        <div className="border-t p-5">
          <h3 className="mb-3 text-sm font-medium">Opened by the auditor: {pdf.title}</h3>
          <AuditPdfPreview
            key={pdf.evidenceId}
            organizationId={organizationId}
            evidenceId={pdf.evidenceId}
            title={pdf.title}
          />
        </div>
      )}
    </section>
  );
}
