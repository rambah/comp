'use client';

import { AppShellAIChatTrigger } from '@trycompai/design-system';
import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

export function HydratedAIChatTrigger() {
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  // The design-system trigger reads navigator.platform while rendering. Defer it
  // until hydration so Linux SSR and a Mac browser cannot produce different text.
  return hydrated ? <AppShellAIChatTrigger /> : <span aria-hidden className="h-8 w-8 sm:w-32" />;
}
