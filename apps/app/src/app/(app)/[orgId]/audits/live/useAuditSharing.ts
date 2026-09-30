'use client';
import { apiClient } from '@/lib/api-client';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface AuditSharingSession {
  allowed: boolean;
  nonce: string;
}

export function useAuditSharing(organizationId: string) {
  const [value, setValue] = useState<{
    organizationId: string;
    session: AuditSharingSession;
  } | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const pending = useRef(false);
  useEffect(() => {
    const lifecycle = generation;
    lifecycle.current++;
    return () => {
      lifecycle.current++;
    };
  }, [organizationId]);
  const stop = useCallback(() => {
    generation.current++;
    setValue(null);
    setStarting(false);
    void apiClient
      .post('/v1/audit-workspace/session/initialize', { allowed: false }, organizationId)
      .catch(() => undefined);
  }, [organizationId]);
  const start = async () => {
    if (pending.current) return false;
    pending.current = true;
    const current = ++generation.current;
    setStarting(true);
    setError(null);
    try {
      const response = await apiClient.post<AuditSharingSession>(
        '/v1/audit-workspace/session/initialize',
        { allowed: true, noticeVersion: 2 },
        organizationId,
      );
      if (current !== generation.current) return false;
      if (response.error || !response.data?.allowed) throw new Error('Unavailable');
      setValue({ organizationId, session: response.data });
      return true;
    } catch {
      if (current === generation.current)
        setError('Live sharing could not start. Please try again.');
      return false;
    } finally {
      pending.current = false;
      if (current === generation.current) setStarting(false);
    }
  };
  return {
    session: value?.organizationId === organizationId ? value.session : null,
    start,
    stop,
    starting,
    error,
  };
}
