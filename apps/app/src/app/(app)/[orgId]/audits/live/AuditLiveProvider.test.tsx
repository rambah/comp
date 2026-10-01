import { act, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuditLiveProvider } from './AuditLiveProvider';

const { post, broadcast } = vi.hoisted(() => ({ post: vi.fn(), broadcast: vi.fn() }));
vi.mock('@/lib/api-client', () => ({ apiClient: { post } }));
vi.mock('./useAuditDomBroadcast', () => ({ useAuditDomBroadcast: broadcast }));
vi.mock('./useAuditDomObserver', () => ({ useAuditDomObserver: () => ({ following: null }) }));

describe('Organization-wide auditor publishing', () => {
  beforeEach(() => {
    vi.spyOn(document, 'hasFocus').mockReturnValue(true);
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    vi.clearAllMocks();
    post.mockResolvedValue({ data: { allowed: true, nonce: 'visit' } });
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  });
  afterEach(() => vi.restoreAllMocks());

  const page = (name: string, canPublish = true) => (
    <AuditLiveProvider organizationId="org1" canPublish={canPublish} canObserve={false}>
      <h1>{name}</h1>
    </AuditLiveProvider>
  );

  it('starts on an ordinary page and retains the session during route changes', async () => {
    const { rerender } = render(page('Policies'));
    await waitFor(() =>
      expect(broadcast).toHaveBeenLastCalledWith({
        organizationId: 'org1',
        session: { allowed: true, nonce: 'visit' },
      }),
    );
    rerender(page('Documents'));
    expect(post).toHaveBeenCalledTimes(1);
    expect(broadcast).toHaveBeenLastCalledWith({
      organizationId: 'org1',
      session: { allowed: true, nonce: 'visit' },
    });
  });

  it('ignores a visible tab in an unfocused window and follows focus changes', async () => {
    vi.mocked(document.hasFocus).mockReturnValue(false);
    render(page('Policies'));
    expect(post).not.toHaveBeenCalled();
    act(() => {
      vi.mocked(document.hasFocus).mockReturnValue(true);
      window.dispatchEvent(new Event('focus'));
    });
    await waitFor(() =>
      expect(broadcast).toHaveBeenLastCalledWith({
        organizationId: 'org1',
        session: { allowed: true, nonce: 'visit' },
      }),
    );
    act(() => {
      vi.mocked(document.hasFocus).mockReturnValue(false);
      window.dispatchEvent(new Event('blur'));
    });
    expect(broadcast).toHaveBeenLastCalledWith({ organizationId: 'org1', session: null });
    post.mockResolvedValue({ data: { allowed: true, nonce: 'new-focus' } });
    act(() => {
      vi.mocked(document.hasFocus).mockReturnValue(true);
      window.dispatchEvent(new Event('focus'));
    });
    await waitFor(() =>
      expect(broadcast).toHaveBeenLastCalledWith({
        organizationId: 'org1',
        session: { allowed: true, nonce: 'new-focus' },
      }),
    );
    expect(post).toHaveBeenCalledTimes(2);
  });

  it('does not start recording non-auditors', () => {
    render(page('People', false));
    expect(post).not.toHaveBeenCalled();
    expect(broadcast).toHaveBeenLastCalledWith({ organizationId: 'org1', session: null });
  });

  it('releases a hidden tab and renews its nonce when returning to it', async () => {
    render(page('Policies'));
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    act(() => {
      vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(broadcast).toHaveBeenLastCalledWith({ organizationId: 'org1', session: null });
    post.mockResolvedValue({ data: { allowed: true, nonce: 'returned' } });
    act(() => {
      vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await waitFor(() =>
      expect(broadcast).toHaveBeenLastCalledWith({
        organizationId: 'org1',
        session: { allowed: true, nonce: 'returned' },
      }),
    );
    expect(post).toHaveBeenCalledTimes(2);
  });
});
