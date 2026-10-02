import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readAuthSession, SessionServiceUnavailableError } from './read-auth-session';

describe('server session verification', () => {
  const fetchMock = vi.fn<typeof fetch>();
  const options = {
    url: 'https://api.example.test/api/auth/get-session',
    headers: { cookie: 'session=one' },
  };
  const session = { user: { id: 'user-1' }, session: { id: 'session-1' } };

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('forwards the current cookies and never caches session responses', async () => {
    fetchMock.mockResolvedValue(Response.json(session));
    await expect(readAuthSession(options)).resolves.toEqual(session);
    expect(fetchMock).toHaveBeenCalledWith(
      options.url,
      expect.objectContaining({
        headers: options.headers,
        cache: 'no-store',
        method: 'GET',
      }),
    );
  });

  it.each([200, 401])(
    'returns no session only for an explicit auth failure (%s)',
    async (status) => {
      fetchMock.mockResolvedValue(Response.json(null, { status }));
      await expect(readAuthSession(options)).resolves.toBeNull();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );

  it.each([429, 500, 503])(
    'recovers from a transient %s without requiring a new login',
    async (status) => {
      fetchMock
        .mockResolvedValueOnce(new Response(null, { status }))
        .mockResolvedValueOnce(Response.json(session));
      await expect(readAuthSession(options)).resolves.toEqual(session);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    },
  );

  it('recovers from a temporary connection failure', async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(Response.json(session));
    await expect(readAuthSession(options)).resolves.toEqual(session);
  });

  it.each([403, 429, 503])(
    'does not report an expired session for persistent %s',
    async (status) => {
      fetchMock.mockImplementation(async () => new Response(null, { status }));
      await expect(readAuthSession(options)).rejects.toBeInstanceOf(SessionServiceUnavailableError);
      expect(fetchMock).toHaveBeenCalledTimes(status === 403 ? 1 : 2);
    },
  );

  it('does not redirect on repeated network failure or invalid JSON', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    await expect(readAuthSession(options)).rejects.toBeInstanceOf(SessionServiceUnavailableError);
    fetchMock.mockResolvedValue(new Response('invalid json'));
    await expect(readAuthSession(options)).rejects.toBeInstanceOf(SessionServiceUnavailableError);
  });

  it('honors a long server retry delay without blocking a page or retrying too soon', async () => {
    fetchMock.mockResolvedValue(
      new Response(null, { status: 429, headers: { 'retry-after': '30' } }),
    );
    await expect(readAuthSession(options)).rejects.toBeInstanceOf(SessionServiceUnavailableError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('keeps simultaneous sessions for the same user separate', async () => {
    fetchMock.mockImplementation(async (_url, init) =>
      Response.json({
        user: { id: 'same-user' },
        session: { id: new Headers(init?.headers).get('cookie') },
      }),
    );
    const sessions = await Promise.all(
      ['first', 'second'].map((id) =>
        readAuthSession<{ session: { id: string } }>({ ...options, headers: { cookie: id } }),
      ),
    );
    expect(sessions.map((result) => result?.session.id)).toEqual(['first', 'second']);
  });
});
