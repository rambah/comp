'use client';
import { apiClient } from '@/lib/api-client';
import { useEffect, useRef, useState } from 'react';
import { initializeActiveAuditTab } from './active-audit-tab';

export interface AuditSharingSession {
  allowed: boolean;
  nonce: string;
}

interface Initialization {
  organizationId: string;
  result: Promise<AuditSharingSession | null>;
}

export function useAuditSharing({
  organizationId,
  enabled = true,
}: {
  organizationId: string;
  enabled?: boolean;
}) {
  const pending = useRef<Initialization | null>(null);
  const current = useRef({ organizationId, enabled, mounted: true });
  current.current.organizationId = organizationId;
  current.current.enabled = enabled;
  const [value, setValue] = useState<{
    initialization: Initialization;
    session: AuditSharingSession | null;
  } | null>(null);

  useEffect(() => {
    current.current.mounted = true;
    let disposed = false;
    if (!enabled) {
      pending.current = null;
      setValue(null);
      return;
    }
    // Reuse the request during Strict Mode effect replay to avoid competing nonces.
    if (pending.current?.organizationId !== organizationId) {
      pending.current = {
        organizationId,
        result: initializeActiveAuditTab({
          organizationId,
          isCurrent: () =>
            current.current.mounted &&
            current.current.enabled &&
            current.current.organizationId === organizationId,
          initialize: () =>
            apiClient
              .post<AuditSharingSession>(
                '/v1/audit-workspace/session/initialize',
                { allowed: true, noticeVersion: 2 },
                organizationId,
              )
              .then((response) =>
                response.error || !response.data?.allowed ? null : response.data,
              ),
        }).catch(() => null),
      };
    }
    const initialization = pending.current;
    void initialization.result.then((session) => {
      if (!disposed) setValue({ initialization, session });
    });
    return () => {
      current.current.mounted = false;
      disposed = true;
    };
  }, [organizationId, enabled]);

  return {
    session:
      enabled &&
      value?.initialization === pending.current &&
      value?.initialization.organizationId === organizationId
        ? value.session
        : null,
  };
}
