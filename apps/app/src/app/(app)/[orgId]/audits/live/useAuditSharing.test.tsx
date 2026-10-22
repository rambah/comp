import { act, renderHook, waitFor } from '@testing-library/react';
import { StrictMode, type PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuditSharing, type AuditSharingSession } from './useAuditSharing';
const { post } = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('@/lib/api-client', () => ({ apiClient: { post } }));

describe('Automatic audit sharing', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(document, 'hasFocus').mockReturnValue(true);
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    post.mockResolvedValue({ data: { allowed: true, nonce: 'visit' } });
  });

  it('initializes on entry exactly once, including Strict Mode', async () => {
    const { result, rerender } = renderHook(() => useAuditSharing({ organizationId: 'org1' }), {
      wrapper: ({ children }: PropsWithChildren) => <StrictMode>{children}</StrictMode>,
    });
    expect(result.current.session).toBeNull();
    await waitFor(() => expect(result.current.session?.nonce).toBe('visit'));
    rerender();
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith(
      '/v1/audit-workspace/session/initialize',
      { allowed: true, noticeVersion: 2 },
      'org1',
    );
  });

  it('discards a late response after switching organizations', async () => {
    let resolve!: (value: { data: AuditSharingSession }) => void;
    post.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    post.mockResolvedValue({ data: { allowed: true, nonce: 'org2-visit' } });
    const { result, rerender } = renderHook(useAuditSharing, {
      initialProps: { organizationId: 'org1' },
    });
    rerender({ organizationId: 'org2' });
    expect(result.current.session).toBeNull();
    await waitFor(() => expect(result.current.session?.nonce).toBe('org2-visit'));
    await act(async () => resolve({ data: { allowed: true, nonce: 'late' } }));
    expect(result.current.session?.nonce).toBe('org2-visit');
  });

  it('never reuses an old session when switching away and back', async () => {
    const { result, rerender } = renderHook(useAuditSharing, {
      initialProps: { organizationId: 'org1' },
    });
    await waitFor(() => expect(result.current.session?.nonce).toBe('visit'));
    post.mockReturnValue(new Promise(() => undefined));
    rerender({ organizationId: 'org2' });
    expect(result.current.session).toBeNull();
    rerender({ organizationId: 'org1' });
    expect(result.current.session).toBeNull();
    expect(post).toHaveBeenCalledTimes(3);
  });

  it('initializes a fresh session on every visit', async () => {
    const first = renderHook(() => useAuditSharing({ organizationId: 'org1' }));
    await waitFor(() => expect(first.result.current.session?.nonce).toBe('visit'));
    first.unmount();
    post.mockResolvedValue({ data: { allowed: true, nonce: 'new-visit' } });
    const next = renderHook(() => useAuditSharing({ organizationId: 'org1' }));
    await waitFor(() => expect(next.result.current.session?.nonce).toBe('new-visit'));
    expect(post).toHaveBeenCalledTimes(2);
  });

  it.each(['rejection', 'error', 'denied'])('does not publish after %s', async (failure) => {
    if (failure === 'rejection') post.mockRejectedValue(new Error('Offline'));
    else if (failure === 'denied')
      post.mockResolvedValue({ data: { allowed: false, nonce: 'no' } });
    else post.mockResolvedValue({ error: 'Unavailable' });
    const { result } = renderHook(() => useAuditSharing({ organizationId: 'org1' }));
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.session).toBeNull();
  });
});
