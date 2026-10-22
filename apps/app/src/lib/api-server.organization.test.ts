import { afterEach, describe, expect, it, vi } from 'vitest';
import { serverApi } from './api-server';
vi.mock('@/env.mjs', () => ({ env: { NEXT_PUBLIC_API_URL: 'https://api.example.test' } }));
vi.mock('next/headers', () => ({
  headers: () => Promise.resolve(new Headers({ cookie: 'session=opaque' })),
}));
describe('Organization-scoped server reads', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('sends the route organization while preserving the session cookie', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('{}'));
    vi.stubGlobal('fetch', fetcher);
    await serverApi.get('/v1/audit-workspace', 'org_b');
    expect(fetcher).toHaveBeenCalledWith(
      'https://api.example.test/v1/audit-workspace',
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          'X-Organization-Id': 'org_b',
          Cookie: 'session=opaque',
        },
        cache: 'no-store',
      }),
    );
  });
  it('preserves the existing active-organization behavior when no override is supplied', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('{}'));
    vi.stubGlobal('fetch', fetcher);
    await serverApi.get('/v1/policies');
    expect(fetcher.mock.calls[0][1].headers).not.toHaveProperty('X-Organization-Id');
  });
});
