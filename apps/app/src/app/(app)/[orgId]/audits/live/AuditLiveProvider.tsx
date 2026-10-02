'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useActiveAuditTab } from './active-audit-tab';
import { useAuditDomBroadcast } from './useAuditDomBroadcast';
import { useAuditDomObserver } from './useAuditDomObserver';
import { useAuditSharing } from './useAuditSharing';

const AuditLiveContext = createContext<ReturnType<typeof useAuditDomObserver> | null>(null);

/** Persist the publisher across every route in this organization's app shell. */
export function AuditLiveProvider({
  organizationId,
  canPublish,
  canObserve,
  children,
}: {
  organizationId: string;
  canPublish: boolean;
  canObserve: boolean;
  children: ReactNode;
}) {
  const active = useActiveAuditTab();
  const observer = useAuditDomObserver({ organizationId, enabled: canObserve });
  const { session } = useAuditSharing({
    organizationId,
    enabled: canPublish && active && !observer.following,
  });
  useAuditDomBroadcast({ organizationId, session });

  return <AuditLiveContext.Provider value={observer}>{children}</AuditLiveContext.Provider>;
}

export function useAuditLiveObserver() {
  const observer = useContext(AuditLiveContext);
  if (!observer) throw new Error('AuditLiveProvider is required');
  return observer;
}
