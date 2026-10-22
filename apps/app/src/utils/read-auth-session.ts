/** A failed auth service request is not evidence that a session has expired. */
export class SessionServiceUnavailableError extends Error {
  constructor() {
    super('Session verification is temporarily unavailable. Please retry.');
    this.name = 'SessionServiceUnavailableError';
  }
}

export async function readAuthSession<T>({
  url,
  headers,
}: {
  url: string;
  headers: Record<string, string>;
}): Promise<T | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers,
        cache: 'no-store',
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      if (attempt === 0) continue;
      throw new SessionServiceUnavailableError();
    }
    // Only a definite authentication failure may redirect the user to sign-in.
    if (response.status === 401) return null;
    if (!response.ok) {
      const retryable = response.status === 429 || response.status >= 500;
      if (retryable && attempt === 0) {
        const retryAfter = Number(
          response.headers.get('retry-after') ?? response.headers.get('x-retry-after') ?? '0',
        );
        if (!Number.isFinite(retryAfter) || retryAfter > 2)
          throw new SessionServiceUnavailableError();
        await new Promise((resolve) => setTimeout(resolve, Math.max(250, retryAfter * 1000)));
        continue;
      }
      throw new SessionServiceUnavailableError();
    }
    try {
      // better-auth returns HTTP 200 with null for a missing/revoked session.
      return (await response.json()) as T | null;
    } catch {
      throw new SessionServiceUnavailableError();
    }
  }
  throw new SessionServiceUnavailableError();
}
