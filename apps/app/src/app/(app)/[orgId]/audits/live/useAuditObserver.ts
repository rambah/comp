'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { AuditLiveEvent, LiveParticipant } from './live-types';
import type { PointerPosition } from './RemotePointer';
import { useLiveSocket } from './useLiveSocket';

export function useAuditObserver({
  organizationId,
  enabled,
}: {
  organizationId: string;
  enabled: boolean;
}) {
  const [participants, setParticipants] = useState<LiveParticipant[]>([]);
  const [following, setFollowing] = useState<string | null>(null);
  const followingRef = useRef(following);
  followingRef.current = following;
  const pointer = useRef<PointerPosition | null>(null);
  const sequences = useRef(new Map<string, number>());
  const stoppedAt = useRef(new Map<string, number>());
  const handleEvent = useCallback((event: AuditLiveEvent) => {
    if (event.kind === 'stop') {
      stoppedAt.current.set(event.nonce, event.sentAt);
      if (stoppedAt.current.size > 100) stoppedAt.current.clear();
      setParticipants((items) => items.filter((item) => item.nonce !== event.nonce));
      if (followingRef.current === event.memberId) pointer.current = null;
      return;
    }
    if (event.sentAt <= (stoppedAt.current.get(event.nonce) ?? 0)) return;
    const key = `${event.nonce}:${event.kind}`;
    if (event.sequence <= (sequences.current.get(key) ?? -1)) return;
    sequences.current.set(key, event.sequence);
    if (sequences.current.size > 200) sequences.current.clear();
    if (event.kind === 'pointer') {
      if (followingRef.current === event.memberId)
        pointer.current = { ...event.pointer, receivedAt: Date.now() };
      return;
    }
    setParticipants((items) => [
      ...items.filter((item) => item.memberId !== event.memberId),
      {
        memberId: event.memberId,
        nonce: event.nonce,
        name: event.name,
        view: event.view,
        receivedAt: Date.now(),
        sequence: event.sequence,
      },
    ]);
  }, []);
  const { connected } = useLiveSocket({
    organizationId,
    mode: 'observe',
    enabled,
    onEvent: handleEvent,
  });
  useEffect(() => {
    if (!connected) {
      setParticipants([]);
      pointer.current = null;
    }
  }, [connected]);
  useEffect(() => {
    pointer.current = null;
  }, [following]);
  useEffect(() => {
    const timer = setInterval(
      () => setParticipants((items) => items.filter((item) => Date.now() - item.receivedAt < 3500)),
      1000,
    );
    return () => clearInterval(timer);
  }, []);
  return {
    participants,
    following,
    setFollowing,
    pointer,
    connected,
    current: participants.find((item) => item.memberId === following) ?? null,
  };
}
