import { afterEach, describe, expect, it, vi } from 'vitest';
import { getFeatureFlags } from './posthog';

describe('Self-hosted ISMS availability', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('makes the installed audit programme available without a PostHog service', async () => {
    vi.stubEnv('SELF_HOSTED', 'true');
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', '');
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', '');
    expect(await getFeatureFlags('user')).toMatchObject({ 'is-isms-enabled': true });
  });

  it('keeps hosted deployments behind their existing feature flag', async () => {
    vi.stubEnv('SELF_HOSTED', 'false');
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', '');
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', '');
    expect(await getFeatureFlags('user')).toEqual({});
  });
});
