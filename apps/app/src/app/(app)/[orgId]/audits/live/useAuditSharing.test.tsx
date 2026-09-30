import { act, renderHook } from '@testing-library/react';
import { StrictMode, type PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuditSharing, type AuditSharingSession } from './useAuditSharing';
const { post } = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('@/lib/api-client', () => ({ apiClient: { post } }));

describe('Explicit audit sharing consent', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    post.mockResolvedValue({ data: { allowed: true, nonce: 'visit' } });
  });
  it('does not initialize on entry, including Strict Mode', () => {
    const { result } = renderHook(() => useAuditSharing('org1'), {
      wrapper: ({ children }: PropsWithChildren) => <StrictMode>{children}</StrictMode>,
    });
    expect(result.current.session).toBeNull();
    expect(post).not.toHaveBeenCalled();
  });
  it('requires an explicit start and clears immediately on stop', async () => {
    const { result } = renderHook(() => useAuditSharing('org1'));
    await act(async () => {
      await result.current.start();
    });
    expect(result.current.session?.allowed).toBe(true);
    act(() => result.current.stop());
    expect(result.current.session).toBeNull();
    expect(post).toHaveBeenLastCalledWith(
      '/v1/audit-workspace/session/initialize',
      { allowed: false },
      'org1',
    );
  });
  it('does not restore sharing from a late initialization response after stop', async () => {
    let resolve!: (value: { data: AuditSharingSession }) => void;
    post.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const { result } = renderHook(() => useAuditSharing('org1'));
    let pending!: Promise<boolean>;
    act(() => {
      pending = result.current.start();
    });
    act(() => result.current.stop());
    await act(async () => {
      resolve({ data: { allowed: true, nonce: 'late' } });
      await pending;
    });
    expect(result.current.session).toBeNull();
  });
  it('never carries sharing into another organization or visit', async () => {
    const { result, rerender, unmount } = renderHook(useAuditSharing, { initialProps: 'org1' });
    await act(async () => {
      await result.current.start();
    });
    rerender('org2');
    expect(result.current.session).toBeNull();
    unmount();
    const next = renderHook(() => useAuditSharing('org1'));
    expect(next.result.current.session).toBeNull();
    expect(post).toHaveBeenCalledTimes(1);
  });
  it('stays private when initialization fails', async () => {
    post.mockRejectedValue(new Error('Offline'));
    const { result } = renderHook(() => useAuditSharing('org1'));
    await act(async () => {
      await result.current.start();
    });
    expect(result.current.session).toBeNull();
    expect(result.current.error).toBeTruthy();
  });
});
