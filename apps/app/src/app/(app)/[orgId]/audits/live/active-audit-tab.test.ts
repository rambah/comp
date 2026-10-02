import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initializeActiveAuditTab } from './active-audit-tab';

describe('active tab initialization ordering', () => {
  beforeEach(() => {
    vi.spyOn(document, 'hasFocus').mockReturnValue(true);
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('serializes old and new tab requests, including a slow old response', async () => {
    let previous: Promise<unknown> = Promise.resolve();
    const request = vi.fn((_key: string, action: () => Promise<unknown>) => {
      const result = previous.then(action);
      previous = result;
      return result;
    });
    vi.stubGlobal('navigator', { locks: { request } });
    let release!: (value: string) => void;
    const oldTab = initializeActiveAuditTab({
      organizationId: 'org',
      initialize: () =>
        new Promise<string>((resolve) => {
          release = resolve;
        }),
    });
    await Promise.resolve();
    const initialize = vi.fn(async () => 'new-nonce');
    const activeTab = initializeActiveAuditTab({ organizationId: 'org', initialize });
    await Promise.resolve();
    expect(initialize).not.toHaveBeenCalled();
    release('old-nonce');
    await expect(oldTab).resolves.toBe('old-nonce');
    await expect(activeTab).resolves.toBe('new-nonce');
    expect(request.mock.calls.map(([key]) => key)).toEqual([
      'audit-publisher:org',
      'audit-publisher:org',
    ]);
  });

  it('skips a queued initialization when the tab has since lost focus', async () => {
    let acquire!: () => Promise<unknown>;
    vi.stubGlobal('navigator', {
      locks: {
        request: (_key: string, action: () => Promise<unknown>) => {
          acquire = action;
          return Promise.resolve(null);
        },
      },
    });
    const initialize = vi.fn(async () => 'nonce');
    await initializeActiveAuditTab({ organizationId: 'org', initialize });
    vi.mocked(document.hasFocus).mockReturnValue(false);
    await expect(acquire()).resolves.toBeNull();
    expect(initialize).not.toHaveBeenCalled();
  });

  it('does not initialize an unmounted or superseded request', async () => {
    const initialize = vi.fn(async () => 'nonce');
    await expect(
      initializeActiveAuditTab({ organizationId: 'org', initialize, isCurrent: () => false }),
    ).resolves.toBeNull();
    expect(initialize).not.toHaveBeenCalled();
  });
});
