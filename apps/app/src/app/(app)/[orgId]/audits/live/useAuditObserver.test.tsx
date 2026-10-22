import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuditLiveEvent } from './live-types';
import { useAuditObserver } from './useAuditObserver';
const state = vi.hoisted(() => ({
  connected: true,
  onEvent: (event: AuditLiveEvent) => {
    void event;
  },
}));
vi.mock('./useLiveSocket', () => ({
  useLiveSocket: ({ onEvent }: { onEvent: (event: AuditLiveEvent) => void }) => {
    state.onEvent = onEvent;
    return { connected: state.connected };
  },
}));
const view = (sequence = 1): AuditLiveEvent => ({
  memberId: 'auditor',
  name: 'Auditor',
  nonce: 'consent',
  sentAt: Date.now(),
  kind: 'view',
  sequence,
  view: { auditId: 'audit', tab: 'checks', checkId: null, evidenceId: null, scrollRatio: 0 },
});
describe('Audit observer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    state.connected = true;
  });
  afterEach(() => vi.useRealTimers());
  it('expires stale views and clears the display on disconnect', () => {
    const hook = renderHook(() => useAuditObserver({ organizationId: 'org', enabled: true }));
    act(() => state.onEvent(view()));
    expect(hook.result.current.participants).toHaveLength(1);
    act(() => vi.advanceTimersByTime(4000));
    expect(hook.result.current.participants).toHaveLength(0);
    act(() => state.onEvent(view(2)));
    state.connected = false;
    hook.rerender();
    expect(hook.result.current.participants).toHaveLength(0);
    hook.unmount();
  });
  it('ignores reordered frames and removes a stopped participant immediately', () => {
    const hook = renderHook(() => useAuditObserver({ organizationId: 'org', enabled: true }));
    act(() => state.onEvent(view(5)));
    act(() => state.onEvent(view(3)));
    expect(hook.result.current.participants[0].sequence).toBe(5);
    act(() => hook.result.current.setFollowing('auditor'));
    act(() =>
      state.onEvent({
        ...view(),
        kind: 'pointer',
        sequence: 6,
        pointer: { x: 0.2, y: 0.3, visible: true },
      }),
    );
    expect(hook.result.current.pointer.current?.x).toBe(0.2);
    act(() => state.onEvent({ ...view(), kind: 'stop' }));
    expect(hook.result.current.pointer.current).toBeNull();
    expect(hook.result.current.participants).toHaveLength(0);
    act(() => state.onEvent(view(7)));
    expect(hook.result.current.participants).toHaveLength(0);
    hook.unmount();
  });
});
