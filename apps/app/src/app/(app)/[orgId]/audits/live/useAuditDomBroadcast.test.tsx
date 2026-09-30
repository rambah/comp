import { act, renderHook } from '@testing-library/react';
import type { eventWithTime } from 'rrweb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuditLiveEvent } from './live-types';
import { useAuditDomBroadcast } from './useAuditDomBroadcast';

const mocks = vi.hoisted(() => ({
  send: vi.fn(),
  encode: vi.fn(),
  record: vi.fn(),
  snapshot: vi.fn(),
  stop: vi.fn(),
  onEvent: (_event: AuditLiveEvent) => {},
}));
vi.mock('./useLiveSocket', () => ({
  useLiveSocket: ({ onEvent }: { onEvent: (event: AuditLiveEvent) => void }) => {
    mocks.onEvent = onEvent;
    return { connected: true, send: mocks.send };
  },
}));
vi.mock('rrweb', () => ({
  record: Object.assign(mocks.record, { takeFullSnapshot: mocks.snapshot }),
}));
vi.mock('./dom-codec', () => ({ encodeBatch: mocks.encode }));

describe('App-wide DOM broadcasting', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mocks.record.mockReturnValue(mocks.stop);
    mocks.encode.mockResolvedValue(['payload']);
    mocks.send.mockReturnValue(true);
  });
  afterEach(() => {
    vi.useRealTimers();
    window.history.replaceState(null, '', '/');
  });

  it('continues sending updates after navigation instead of silently dropping all events', async () => {
    window.history.replaceState(null, '', '/org1/audits');
    const { unmount } = renderHook(() =>
      useAuditDomBroadcast({
        organizationId: 'org1',
        session: { allowed: true, nonce: 'publisher' },
      }),
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    const options = mocks.record.mock.calls[0][0] as { emit: (event: eventWithTime) => void };
    act(() =>
      mocks.onEvent({
        kind: 'watch',
        memberId: 'admin',
        name: 'Admin',
        nonce: 'viewer',
        targetNonce: 'publisher',
        watching: true,
        requestSnapshot: true,
        sentAt: Date.now(),
        sequence: 1,
      }),
    );
    window.history.replaceState(null, '', '/org1/policies');
    const event: eventWithTime = {
      type: 4,
      timestamp: Date.now(),
      data: { href: window.location.href, width: 1280, height: 800 },
    };
    act(() => options.emit(event));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    expect(mocks.encode).toHaveBeenCalledWith({ events: [event], pdf: null });
    expect(mocks.send).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'dom', payload: 'payload' }),
    );
    unmount();
    expect(mocks.stop).toHaveBeenCalledOnce();
  });
});
