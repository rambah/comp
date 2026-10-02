'use client';
import { Button } from '@trycompai/design-system';
import { useEffect, useRef, useState } from 'react';
import type { Replayer } from 'rrweb';
import 'rrweb/dist/style.css';
import { z } from 'zod';
import { loadRecording } from './load-recording';
import { durationLabel } from './recording-types';

export function RecordingPlayer({ organizationId, id }: { organizationId: string; id: string }) {
  const container = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const player = useRef<Replayer | null>(null);
  const firstFrame = useRef(0);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setInterval> | undefined;
    let sizing: ResizeObserver | undefined;
    setReady(false);
    setPlaying(false);
    setPosition(0);
    setProgress(0);
    setError('');
    setSpeed(1);
    void (async () => {
      const [events, { Replayer: Player, ReplayerEvents }] = await Promise.all([
        loadRecording({ organizationId, id, signal: controller.signal, onProgress: setProgress }),
        import('rrweb'),
      ]);
      if (controller.signal.aborted || !stage.current || !container.current) return;
      const replay = new Player(events, {
        root: stage.current,
        pauseAnimation: false,
        mouseTail: false,
        showWarning: false,
        showDebug: false,
        UNSAFE_replayCanvas: false,
      });
      player.current = replay;
      replay.iframe.title = 'Auditor recording (read-only)';
      replay.iframe.setAttribute('sandbox', 'allow-same-origin');
      replay.iframe.setAttribute('inert', '');
      replay.iframe.tabIndex = -1;
      replay.disableInteract();
      const meta = events.find((event) => event.type === 4);
      let width = meta?.type === 4 ? meta.data.width : 1280;
      let height = meta?.type === 4 ? meta.data.height : 800;
      const resize = () => {
        if (!container.current || !stage.current) return;
        const scale = Math.min(1, container.current.clientWidth / Math.max(1, width));
        replay.wrapper.style.transformOrigin = 'top left';
        replay.wrapper.style.transform = `scale(${scale})`;
        stage.current.style.height = `${height * scale}px`;
      };
      replay.on(ReplayerEvents.Resize, (value: unknown) => {
        const parsed = z
          .object({ width: z.number().positive(), height: z.number().positive() })
          .safeParse(value);
        if (!parsed.success) return;
        const size = parsed.data;
        width = size.width;
        height = size.height;
        resize();
      });
      const total = replay.getMetaData().totalTime;
      setDuration(total);
      const snapshot = events.find((event) => event.type === 2);
      firstFrame.current = snapshot
        ? Math.min(total, Math.max(0, snapshot.timestamp - (events[0]?.timestamp ?? 0) + 1))
        : 0;
      replay.on(ReplayerEvents.Finish, () => {
        setPlaying(false);
        setPosition(total);
      });
      sizing = new ResizeObserver(resize);
      sizing.observe(container.current);
      replay.pause(firstFrame.current);
      resize();
      setReady(true);
      timer = setInterval(
        () => setPosition(Math.min(total, Math.max(0, replay.getCurrentTime()))),
        100,
      );
    })().catch((reason) => {
      if (!controller.signal.aborted)
        setError(reason instanceof Error ? reason.message : 'Playback unavailable.');
    });
    return () => {
      controller.abort();
      clearInterval(timer);
      sizing?.disconnect();
      player.current?.destroy();
      player.current = null;
    };
  }, [organizationId, id]);
  const handlePlay = () => {
    if (!player.current) return;
    if (playing) player.current.pause();
    else player.current.play(Math.max(firstFrame.current, position >= duration ? 0 : position));
    setPlaying(!playing);
  };
  const handleSeek = (time: number) => {
    if (playing) player.current?.play(time);
    else player.current?.pause(Math.max(firstFrame.current, time));
    setPosition(time);
  };
  const handleSpeed = () => {
    const next = speed === 1 ? 2 : speed === 2 ? 0.5 : 1;
    player.current?.setConfig({ speed: next });
    setSpeed(next);
  };
  return (
    <div
      ref={container}
      data-audit-live-private
      className="overflow-hidden rounded-lg border bg-background"
    >
      <div className="flex flex-wrap items-center gap-3 border-b p-4">
        <Button size="sm" onClick={handlePlay} disabled={!ready}>
          {playing ? 'Pause' : 'Play'}
        </Button>
        <span className="text-xs tabular-nums">
          {durationLabel(position)} / {durationLabel(duration)}
        </span>
        <input
          aria-label="Playback position"
          type="range"
          min={0}
          max={duration || 1}
          step={100}
          value={position}
          disabled={!ready}
          onChange={(event) => handleSeek(Number(event.target.value))}
          className="min-w-24 flex-1 accent-primary"
        />
        <Button size="sm" variant="outline" disabled={!ready} onClick={handleSpeed}>
          {speed}×
        </Button>
      </div>
      {!ready && (
        <p role="status" className="p-8 text-sm text-muted-foreground">
          {error || `Loading recording… ${progress}%`}
        </p>
      )}
      <div ref={stage} className="relative overflow-hidden" />
    </div>
  );
}
