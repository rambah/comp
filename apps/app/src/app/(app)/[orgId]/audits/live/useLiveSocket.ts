'use client';
import { env } from '@/env.mjs';
import { apiClient } from '@/lib/api-client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { liveEventSchema, type AuditLiveEvent } from './live-types';

export function useLiveSocket({
  organizationId,
  mode,
  nonce,
  enabled,
  onEvent,
}: {
  organizationId: string;
  mode: 'publish' | 'observe';
  nonce?: string;
  enabled: boolean;
  onEvent?: (event: AuditLiveEvent) => void;
}) {
  const socket = useRef<WebSocket | null>(null);
  const callback = useRef(onEvent);
  callback.current = onEvent;
  const [connected, setConnected] = useState(false);
  const ready = useRef(false);
  const sequence = useRef(0);
  const queue = useRef<string[]>([]);
  const queuedBytes = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setConnected(false);
      return;
    }
    let disposed = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let watchdog: ReturnType<typeof setInterval> | undefined;
    let attempt = 0;
    let lastReceived = Date.now();
    const flush = setInterval(() => {
      const ws = socket.current;
      if (!ready.current || ws?.readyState !== WebSocket.OPEN) return;
      while (queue.current.length && ws.bufferedAmount < 128000) {
        const message = queue.current.shift()!;
        queuedBytes.current -= message.length;
        ws.send(message);
      }
    }, 25);
    const schedule = () => {
      ready.current = false;
      queue.current = [];
      queuedBytes.current = 0;
      setConnected(false);
      if (watchdog) clearInterval(watchdog);
      if (!disposed)
        retry = setTimeout(
          () => void connect().catch(schedule),
          Math.min(15000, 1000 * 2 ** attempt++) + Math.random() * 250,
        );
    };
    const connect = async () => {
      if (disposed) return;
      const response = await apiClient.post<{ ticket: string }>(
        '/v1/audit-workspace/session/ticket',
        { mode, ...(nonce ? { nonce } : {}) },
        organizationId,
      );
      if (disposed) return;
      // Revoked consent/access must never be silently granted again on reconnect.
      if (response.status === 401 || response.status === 403) {
        ready.current = false;
        setConnected(false);
        return;
      }
      if (!response.data?.ticket) {
        schedule();
        return;
      }
      const url = new URL(
        '/v1/audit-workspace/session/socket',
        env.NEXT_PUBLIC_API_URL || 'http://localhost:3333',
      );
      url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(url.toString());
      socket.current = ws;
      ws.onopen = () => {
        ws.send(JSON.stringify({ ticket: response.data!.ticket }));
      };
      ws.onmessage = (message) => {
        if (disposed) return;
        try {
          const data: unknown = JSON.parse(String(message.data));
          lastReceived = Date.now();
          if (typeof data === 'object' && data && 'kind' in data && data.kind === 'ready') {
            ready.current = true;
            setConnected(true);
            attempt = 0;
          }
          const event = liveEventSchema.safeParse(data);
          if (event.success) callback.current?.(event.data);
        } catch {
          ws.close();
        }
      };
      ws.onerror = () => ws.close();
      ws.onclose = () => {
        if (socket.current === ws) socket.current = null;
        if (!disposed) schedule();
      };
      lastReceived = Date.now();
      watchdog = setInterval(() => {
        if (Date.now() - lastReceived > 12000) ws.close();
      }, 2000);
    };
    void connect().catch(schedule);
    return () => {
      disposed = true;
      ready.current = false;
      clearTimeout(retry);
      clearInterval(watchdog);
      clearInterval(flush);
      queue.current = [];
      queuedBytes.current = 0;
      socket.current?.close();
      socket.current = null;
    };
  }, [organizationId, mode, nonce, enabled]);

  const send = useCallback((message: object) => {
    const ws = socket.current;
    if (!ready.current || ws?.readyState !== WebSocket.OPEN) return false;
    const value = JSON.stringify({ ...message, sequence: ++sequence.current });
    if (queuedBytes.current + value.length > 8000000) {
      ws.close();
      return false;
    }
    queue.current.push(value);
    queuedBytes.current += value.length;
    return true;
  }, []);
  return { connected, send };
}
