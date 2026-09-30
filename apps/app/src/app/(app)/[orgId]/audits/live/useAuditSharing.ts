'use client';
import { apiClient } from '@/lib/api-client';
import { useEffect, useRef, useState } from 'react';

export interface AuditSharingSession {
  allowed: boolean;
  nonce: string;
}

interface Initialization {
  organizationId: string;
  result: Promise<AuditSharingSession | null>;
}

export function useAuditSharing(organizationId: string) {
  const pending = useRef<Initialization | null>(null);
  const [value, setValue] = useState<{
    initialization: Initialization;
    session: AuditSharingSession | null;
  } | null>(null);

  useEffect(() => {
    let disposed = false;
    // Reuse the request during Strict Mode effect replay to avoid competing nonces.
    if (pending.current?.organizationId !== organizationId) {
      pending.current = {
        organizationId,
        result: apiClient
          .post<AuditSharingSession>(
            '/v1/audit-workspace/session/initialize',
            { allowed: true, noticeVersion: 2 },
            organizationId,
          )
          .then((response) => (response.error || !response.data?.allowed ? null : response.data))
          .catch(() => null),
      };
    }
    const initialization = pending.current;
    void initialization.result.then((session) => {
      if (!disposed) setValue({ initialization, session });
    });
    return () => {
      disposed = true;
    };
  }, [organizationId]);

  return {
    session:
      value?.initialization === pending.current &&
      value?.initialization.organizationId === organizationId
        ? value.session
        : null,
  };
}
