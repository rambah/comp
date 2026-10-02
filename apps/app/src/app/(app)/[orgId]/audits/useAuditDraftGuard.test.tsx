import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useAuditDraftGuard } from './useAuditDraftGuard';
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));
describe('Pending audit draft protection', () => {
  it('blocks sidebar navigation until the draft is saved', () => {
    const hook = renderHook(useAuditDraftGuard, { initialProps: true });
    const link = document.createElement('a');
    link.href = '/other-workspace';
    document.body.appendChild(link);
    const pending = new MouseEvent('click', { bubbles: true, cancelable: true });
    link.dispatchEvent(pending);
    expect(pending.defaultPrevented).toBe(true);
    const unload = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(unload);
    expect(unload.defaultPrevented).toBe(true);
    hook.rerender(false);
    const saved = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(saved);
    expect(saved.defaultPrevented).toBe(false);
    link.remove();
    hook.unmount();
  });
});
