import { apiClient } from '@/lib/api-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { decodeBatch } from '../live/dom-codec';
import { loadRecording } from './load-recording';
vi.mock('@/lib/api-client', () => ({ apiClient: { call: vi.fn() } }));
vi.mock('../live/dom-codec', () => ({ decodeBatch: vi.fn() }));
const packet = { epoch: 'one', batch: 0, part: 0, parts: 1, payload: 'encoded' };
const options = () => ({
  id: 'rec',
  organizationId: 'org',
  signal: new AbortController().signal,
  onProgress: vi.fn(),
});
describe('Recording playback loading', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(decodeBatch).mockResolvedValue({
      events: [
        { type: 4, timestamp: 10, data: { width: 100, height: 100, href: '' } },
        {
          type: 2,
          timestamp: 11,
          data: { node: { type: 0, id: 1, childNodes: [] }, initialOffset: { top: 0, left: 0 } },
        },
      ],
      pdf: null,
    });
  });
  it('loads authenticated org-scoped chunks in order without public object links', async () => {
    vi.mocked(apiClient.call)
      .mockResolvedValueOnce({ status: 200, data: { chunks: [{ index: 0 }] } })
      .mockResolvedValueOnce({ status: 200, data: { packets: [packet] } });
    expect(await loadRecording(options())).toHaveLength(2);
    expect(apiClient.call).toHaveBeenLastCalledWith(
      '/v1/audit-recordings/rec/chunks/0',
      expect.objectContaining({ organizationId: 'org', cache: 'no-store' }),
    );
  });
  it('rejects denied manifests without attempting chunk requests', async () => {
    vi.mocked(apiClient.call).mockResolvedValueOnce({ status: 403, error: 'Forbidden' });
    await expect(loadRecording(options())).rejects.toThrow('unavailable');
    expect(apiClient.call).toHaveBeenCalledTimes(1);
  });
  it('rejects missing parts instead of showing misleading playback', async () => {
    vi.mocked(apiClient.call)
      .mockResolvedValueOnce({ status: 200, data: { chunks: [{ index: 0 }] } })
      .mockResolvedValueOnce({
        status: 200,
        data: { packets: [{ ...packet, part: 1, parts: 2 }] },
      });
    await expect(loadRecording(options())).rejects.toThrow('gap');
    expect(decodeBatch).not.toHaveBeenCalled();
  });
  it('cancels loading when the player is closed', async () => {
    const controller = new AbortController();
    controller.abort();
    vi.mocked(apiClient.call).mockResolvedValueOnce({
      status: 200,
      data: { chunks: [{ index: 0 }] },
    });
    await expect(loadRecording({ ...options(), signal: controller.signal })).rejects.toThrow();
    expect(apiClient.call).toHaveBeenCalledTimes(1);
  });
});
