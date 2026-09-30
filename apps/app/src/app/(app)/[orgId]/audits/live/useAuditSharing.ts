'use client';
import { apiClient } from '@/lib/api-client';
import { useEffect, useRef, useState } from 'react';

export interface AuditSharingSession {
  allowed: boolean;
  nonce: string;
}

export function useAuditSharing(organizationId: string) {
  const pending = useRef<{
    organizationId: string;
    result: Promise<AuditSharingSession | null>;
  } | null>(null);
  const [session, setSession] = useState<{
    organizationId: string;
    value: AuditSharingSession | null;
  } | null>(null);

  useEffect(() => {
    let disposed = false;
    // Reuse initialization when Strict Mode re-runs the effect so it cannot
    // create competing nonces for the same workspace visit.
    if (pending.current?.organizationId !== organizationId) {
      pending.current = {
        organizationId,
        result: apiClient
          .post<AuditSharingSession>(
            '/v1/audit-workspace/session/initialize',
            { allowed: true },
            organizationId,
          )
          .then((response) => (response.error ? null : (response.data ?? null)))
          .catch(() => null),
      };
    }
    void pending.current.result.then((value) => {
      if (!disposed) setSession({ organizationId, value });
    });
    return () => {
      disposed = true;
    };
  }, [organizationId]);

  return session?.organizationId === organizationId ? session.value : null;
}
