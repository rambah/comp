'use client';
import { useEffect } from 'react';
import { toast } from 'sonner';

/** Keep sidebar navigation from discarding a pending save or conflicted draft. */
export function useAuditDraftGuard(busy: boolean) {
  useEffect(() => {
    if (!busy) return;
    const handleUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    const handleNavigation = (event: MouseEvent) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0)
        return;
      const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!(link instanceof HTMLAnchorElement) || link.target === '_blank' || link.download) return;
      if (link.href === window.location.href || link.getAttribute('href')?.startsWith('#')) return;
      event.preventDefault();
      event.stopPropagation();
      toast.error('Save your audit draft before leaving. If saving failed, copy your draft first.');
    };
    window.addEventListener('beforeunload', handleUnload);
    document.addEventListener('click', handleNavigation, true);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      document.removeEventListener('click', handleNavigation, true);
    };
  }, [busy]);
}
