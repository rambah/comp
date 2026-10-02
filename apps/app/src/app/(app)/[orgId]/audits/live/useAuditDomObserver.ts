'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { decodeBatch, type DomBatch } from './dom-codec';
import type { AuditLiveEvent } from './live-types';
import { useLiveSocket } from './useLiveSocket';

export interface DomParticipant {
  memberId: string;
  nonce: string;
  name: string;
  receivedAt: number;
}
export function useAuditDomObserver({
  organizationId,
  enabled,
}: {
  organizationId: string;
  enabled: boolean;
}) {
  const [participants, setParticipants] = useState<DomParticipant[]>([]);
  const [following, setFollowing] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const target = useRef<string | null>(null);
  const needsSnapshot = useRef(true);
  const consume = useRef<((batch: DomBatch, reset: boolean) => void) | null>(null);
  const clearView = useRef<(() => void) | null>(null);
  const stream = useRef({ epoch: '', batch: 0, part: 0, parts: [] as string[] });
  const chain = useRef(Promise.resolve());
  const pending = useRef(0);
  const generation = useRef(0);
  const lastPartAt = useRef(0);
  const invalidate = useCallback(() => {
    generation.current++;
    stream.current = { epoch: '', batch: 0, part: 0, parts: [] };
    needsSnapshot.current = true;
    setReady(false);
    clearView.current?.();
  }, []);
  const handleEvent = useCallback(
    (event: AuditLiveEvent) => {
      if (event.kind === 'presence') {
        setParticipants((items) => [
          ...items.filter((p) => p.memberId !== event.memberId),
          {
            memberId: event.memberId,
            nonce: event.nonce,
            name: event.name,
            receivedAt: Date.now(),
          },
        ]);
        return;
      }
      if (event.kind === 'stop') {
        setParticipants((items) => items.filter((p) => p.nonce !== event.nonce));
        if (event.nonce === target.current) invalidate();
        return;
      }
      if (event.kind !== 'dom' || event.nonce !== target.current) return;
      const current = generation.current;
      if (++pending.current > 256) {
        pending.current--;
        invalidate();
        return;
      }
      chain.current = chain.current
        .then(async () => {
          if (current !== generation.current) return;
          const state = stream.current;
          if (event.epoch !== state.epoch) {
            if (event.batch !== 0 || event.part !== 0) return;
            state.epoch = event.epoch;
            state.batch = 0;
            state.part = 0;
            state.parts = [];
          }
          if (
            event.batch !== state.batch ||
            event.part !== state.part ||
            event.part >= event.parts
          ) {
            invalidate();
            return;
          }
          state.parts.push(event.payload);
          lastPartAt.current = Date.now();
          state.part++;
          if (state.part < event.parts) return;
          const decoded = await decodeBatch(state.parts);
          if (current !== generation.current) return;
          const reset = event.batch === 0;
          if (reset && !decoded.events.some((e) => e.type === 2)) {
            invalidate();
            return;
          }
          if (!consume.current) return invalidate();
          consume.current(decoded, reset);
          needsSnapshot.current = false;
          setReady(true);
          state.batch++;
          state.part = 0;
          state.parts = [];
        })
        .catch(invalidate)
        .finally(() => {
          pending.current--;
        });
    },
    [invalidate],
  );
  const { connected, send } = useLiveSocket({
    organizationId,
    mode: 'observe',
    enabled,
    onEvent: handleEvent,
  });
  const current = participants.find((p) => p.memberId === following) ?? null;
  const nonce = current?.nonce;
  useEffect(() => {
    invalidate();
    target.current = nonce ?? null;
    if (!connected || !nonce) return;
    const watch = () => {
      if (stream.current.part && Date.now() - lastPartAt.current > 4000) invalidate();
      send({
        kind: 'watch',
        targetNonce: nonce,
        watching: true,
        requestSnapshot: needsSnapshot.current,
      });
    };
    watch();
    const timer = setInterval(watch, 3000);
    return () => {
      clearInterval(timer);
      target.current = null;
      invalidate();
      send({ kind: 'watch', targetNonce: nonce, watching: false, requestSnapshot: false });
    };
  }, [connected, nonce, send, invalidate]);
  useEffect(() => {
    if (!connected) {
      setParticipants([]);
      invalidate();
    }
  }, [connected, invalidate]);
  useEffect(() => {
    const timer = setInterval(
      () => setParticipants((items) => items.filter((p) => Date.now() - p.receivedAt < 15000)),
      2000,
    );
    return () => clearInterval(timer);
  }, []);
  return { participants, following, setFollowing, connected, current, ready, consume, clearView };
}
