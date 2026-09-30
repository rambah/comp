import { act, renderHook, waitFor } from '@testing-library/react';
import { StrictMode, useRef, type PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuditBroadcast } from './useAuditBroadcast';
import { useAuditSharing, type AuditSharingSession } from './useAuditSharing';

const { post, socket } = vi.hoisted(() => ({ post: vi.fn(), socket: vi.fn() }));
vi.mock('@/lib/api-client', () => ({ apiClient: { post } }));
vi.mock('./useLiveSocket', () => ({ useLiveSocket: socket }));

function useSharingVisit(organizationId: string) {
  const session = useAuditSharing(organizationId);
  const root = useRef<HTMLDivElement>(null);
  useAuditBroadcast({ organizationId, session, root, view: null, paused: false });
  return session;
}

describe('Automatic audit sharing', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    post.mockResolvedValue({ data: { allowed: true, nonce: 'visit1' } });
    socket.mockReturnValue({ connected: false, send: vi.fn() });
  });

  it('starts publishing on entry without a user action', async () => {
    const { result } = renderHook(() => useSharingVisit('org1'));
    expect(result.current).toBeNull();
    expect(socket).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: false }));
    await waitFor(() => expect(result.current?.nonce).toBe('visit1'));
    expect(post).toHaveBeenCalledWith(
      '/v1/audit-workspace/session/initialize',
      { allowed: true },
      'org1',
    );
    expect(socket).toHaveBeenLastCalledWith({
      organizationId: 'org1',
      mode: 'publish',
      nonce: 'visit1',
      enabled: true,
    });
  });

  it('initializes once when Strict Mode replays effects', async () => {
    const { result, rerender } = renderHook(() => useSharingVisit('org1'), {
      wrapper: ({ children }: PropsWithChildren) => <StrictMode>{children}</StrictMode>,
    });
    await waitFor(() => expect(result.current?.allowed).toBe(true));
    rerender();
    expect(post).toHaveBeenCalledTimes(1);
  });

  it.each(['error', 'rejection', 'denied'])(
    'does not publish after initialization returns %s',
    async (failure) => {
      if (failure === 'rejection') post.mockRejectedValue(new Error('Offline'));
      else if (failure === 'denied')
        post.mockResolvedValue({ data: { allowed: false, nonce: 'no' } });
      else post.mockResolvedValue({ error: 'Unavailable' });
      await act(async () => {
        renderHook(() => useSharingVisit('org1'));
      });
      expect(socket).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: false }));
    },
  );

  it('discards a pending response from the previous organization', async () => {
    let resolvePrevious!: (value: { data: AuditSharingSession }) => void;
    post.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolvePrevious = resolve;
        }),
    );
    post.mockResolvedValue({ data: { allowed: true, nonce: 'org2-visit' } });
    const { result, rerender } = renderHook(useSharingVisit, { initialProps: 'org1' });
    rerender('org2');
    expect(result.current).toBeNull();
    await waitFor(() => expect(result.current?.nonce).toBe('org2-visit'));
    await act(async () => resolvePrevious({ data: { allowed: true, nonce: 'old' } }));
    expect(result.current?.nonce).toBe('org2-visit');
    expect(socket).toHaveBeenLastCalledWith(
      expect.objectContaining({
        organizationId: 'org2',
        nonce: 'org2-visit',
        enabled: true,
      }),
    );
  });

  it('never reuses the previous organization’s session while initializing', async () => {
    const { result, rerender } = renderHook(useSharingVisit, { initialProps: 'org1' });
    await waitFor(() => expect(result.current?.nonce).toBe('visit1'));
    post.mockReturnValue(new Promise(() => undefined));
    rerender('org2');
    expect(result.current).toBeNull();
    expect(socket).toHaveBeenLastCalledWith(
      expect.objectContaining({
        organizationId: 'org2',
        enabled: false,
      }),
    );
  });

  it('creates a fresh session for a new visit', async () => {
    const first = renderHook(() => useSharingVisit('org1'));
    await waitFor(() => expect(first.result.current?.nonce).toBe('visit1'));
    first.unmount();
    post.mockResolvedValue({ data: { allowed: true, nonce: 'visit2' } });
    const second = renderHook(() => useSharingVisit('org1'));
    await waitFor(() => expect(second.result.current?.nonce).toBe('visit2'));
    expect(post).toHaveBeenCalledTimes(2);
  });
});
