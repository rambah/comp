import { apiClient } from '@/lib/api-client';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { SWRConfig } from 'swr';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuditResearch } from './useAuditResearch';
vi.mock('@/lib/api-client', () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }));
function wrapper({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{ provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false }}
    >
      {children}
    </SWRConfig>
  );
}
describe('saved research client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.get).mockImplementation(
      async (path) =>
        ({
          status: 200,
          data: path.includes('/audits/')
            ? { model: { id: 'gpt-6.1-sol', label: 'GPT-6.1 Sol' }, available: true, threads: [] }
            : { id: 'thread', title: 'Saved topic', turns: [], olderCursor: null },
        }) as never,
    );
  });
  it('reuses the request UUID after an uncertain response and sends only validated fields', async () => {
    vi.mocked(apiClient.post)
      .mockResolvedValueOnce({ error: 'Network interrupted', status: 0 })
      .mockResolvedValueOnce({ data: { status: 'running' }, status: 202 } as never);
    const { result } = renderHook(
      () => useAuditResearch({ organizationId: 'org', auditId: 'audit', threadId: 'thread' }),
      { wrapper },
    );
    await act(async () => {
      await expect(result.current.ask({ id: 'thread', prompt: 'Question' })).rejects.toThrow(
        'Network',
      );
    });
    await act(async () => {
      await result.current.ask({ id: 'thread', prompt: 'Question' });
    });
    const first = vi.mocked(apiClient.post).mock.calls[0];
    const second = vi.mocked(apiClient.post).mock.calls[1];
    expect(first[1]).toEqual(second[1]);
    expect(first[1]).toEqual({ prompt: 'Question', requestId: expect.any(String) });
    expect(first[2]).toBe('org');
  });
  it('restores a saved conversation through the organization-scoped API', async () => {
    const { result } = renderHook(
      () => useAuditResearch({ organizationId: 'org', auditId: 'audit', threadId: 'thread' }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.conversation.data?.title).toBe('Saved topic'));
    expect(apiClient.get).toHaveBeenCalledWith(
      '/v1/audit-workspace/research/threads/thread',
      'org',
    );
  });
});
