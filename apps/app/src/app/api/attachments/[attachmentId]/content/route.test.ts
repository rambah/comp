import { serverApi } from '@/lib/api-server';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';
vi.mock('@/lib/api-server', () => ({ serverApi: { get: vi.fn() } }));
const fetchMock = vi.fn();
const getMock = vi.mocked(serverApi.get);
const call = (query = '') =>
  GET(new NextRequest(`https://comp.example/api/attachments/att_123/content${query}`), {
    params: Promise.resolve({ attachmentId: 'att_123' }),
  });
beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  getMock.mockResolvedValue({
    status: 200,
    data: { downloadUrl: 'https://storage.example/signed' },
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});
describe('Authenticated attachment content', () => {
  it.each([401, 403, 404])(
    'does not contact storage when API denies access (%s)',
    async (status) => {
      getMock.mockResolvedValue({ status, error: 'Denied' });
      expect((await call()).status).toBe(status);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );
  it('streams a download as attachment without forwarding cookies or allowing redirects', async () => {
    fetchMock.mockResolvedValue(new Response('# Evidence'));
    const response = await call('?download=1&name=report.md');
    expect(await response.text()).toBe('# Evidence');
    expect(response.headers.get('content-disposition')).toContain('attachment;');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('content-type')).toBe('application/octet-stream');
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ redirect: 'error', cache: 'no-store' });
    expect(fetchMock.mock.calls[0][1]).not.toHaveProperty('headers');
  });
  it('rejects oversized previews, including when storage omits content length', async () => {
    fetchMock.mockResolvedValue(new Response(new Uint8Array(20 * 1024 * 1024 + 1)));
    expect((await call()).status).toBe(413);
  });
  it('does not expose signed URLs in storage errors', async () => {
    fetchMock.mockRejectedValue(new Error('https://storage.example/?secret'));
    const response = await call();
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain('secret');
  });
  it('rejects path traversal before calling the API', async () => {
    const response = await GET(new NextRequest('https://comp.example'), {
      params: Promise.resolve({ attachmentId: '../secret' }),
    });
    expect(response.status).toBe(400);
    expect(getMock).not.toHaveBeenCalled();
  });
});
