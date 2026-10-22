'use client';

import { useSyncExternalStore } from 'react';

export function isActiveAuditTab() {
  return document.visibilityState === 'visible' && document.hasFocus();
}

function subscribe(callback: () => void) {
  document.addEventListener('visibilitychange', callback);
  window.addEventListener('focus', callback);
  window.addEventListener('blur', callback);
  window.addEventListener('pageshow', callback);
  return () => {
    document.removeEventListener('visibilitychange', callback);
    window.removeEventListener('focus', callback);
    window.removeEventListener('blur', callback);
    window.removeEventListener('pageshow', callback);
  };
}

export function useActiveAuditTab() {
  return useSyncExternalStore(subscribe, isActiveAuditTab, () => false);
}

/** Serialize nonce changes across tabs so an old request cannot replace the active tab. */
export async function initializeActiveAuditTab<T>({
  organizationId,
  initialize,
  isCurrent = () => true,
}: {
  organizationId: string;
  initialize: () => Promise<T>;
  isCurrent?: () => boolean;
}): Promise<T | null> {
  const run = () => (isCurrent() && isActiveAuditTab() ? initialize() : Promise.resolve(null));
  if (!navigator.locks) return run();
  return navigator.locks.request(`audit-publisher:${organizationId}`, run);
}
