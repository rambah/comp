'use client';

import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react';
import { useAuditDomBroadcast } from './useAuditDomBroadcast';
import { useAuditDomObserver } from './useAuditDomObserver';
import { useAuditSharing } from './useAuditSharing';

const AuditLiveContext = createContext<ReturnType<typeof useAuditDomObserver> | null>(null);
const subscribeVisibility = (callback: () => void) => {
  document.addEventListener('visibilitychange', callback);
  return () => document.removeEventListener('visibilitychange', callback);
};

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
  const visible = useSyncExternalStore(
    subscribeVisibility,
    () => document.visibilityState !== 'hidden',
    () => false,
  );
  const observer = useAuditDomObserver({ organizationId, enabled: canObserve });
  const { session } = useAuditSharing({
    organizationId,
    enabled: canPublish && visible && !observer.following,
  });
  useAuditDomBroadcast({ organizationId, session });

  return <AuditLiveContext.Provider value={observer}>{children}</AuditLiveContext.Provider>;
}

export function useAuditLiveObserver() {
  const observer = useContext(AuditLiveContext);
  if (!observer) throw new Error('AuditLiveProvider is required');
  return observer;
}
