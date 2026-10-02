import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { NuqsAdapter } from 'nuqs/adapters/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useAuditNavigation } from './useAuditNavigation';

const workspace = '/org1/audits';
const renderNavigation = () =>
  renderHook(() => useAuditNavigation({ defaultAuditId: 'audit1' }), { wrapper: NuqsAdapter });

// Exercise browser history rather than mocking the navigation setters.
describe('Audit workspace browser history', () => {
  beforeEach(() => window.history.replaceState(null, '', workspace));
  afterEach(cleanup);

  it('returns from a check to the workspace and restores it with Forward', async () => {
    const { result } = renderNavigation();
    act(() => result.current.navigate({ checkId: 'check1', tab: 'checks' }));
    await waitFor(() => expect(location.search).toContain('checkId=check1'));
    act(() => window.history.back());
    await waitFor(() => expect(result.current.checkId).toBeNull());
    expect(location.pathname).toBe(workspace);
    act(() => window.history.forward());
    await waitFor(() => expect(result.current.checkId).toBe('check1'));
    expect(result.current.auditId).toBe('audit1');
  });

  it('restores the exact audit, tab and preview after leaving for a document', async () => {
    const view = renderNavigation();
    act(() =>
      view.result.current.navigate({
        auditId: 'audit2',
        tab: 'evidence',
        evidenceId: 'evidence1',
        compareId: 'evidence2',
      }),
    );
    await waitFor(() => expect(location.search).toContain('compareId=evidence2'));
    const savedUrl = location.href;
    view.unmount();
    window.history.pushState(null, '', '/org1/documents/isms/scope');
    window.history.back();
    await waitFor(() => expect(location.href).toBe(savedUrl));
    const returned = renderNavigation();
    expect(returned.result.current).toMatchObject({
      auditId: 'audit2',
      tab: 'evidence',
      evidenceId: 'evidence1',
      compareId: 'evidence2',
    });
  });

  it('restores research and findings through Back and a remount', async () => {
    const view = renderNavigation();
    act(() =>
      view.result.current.navigate({ tab: 'research', threadId: 'thread1', sourceKey: 'turn1:1' }),
    );
    await waitFor(() => expect(location.search).toContain('threadId=thread1'));
    act(() => view.result.current.navigate({ tab: 'findings', findingId: 'finding1' }));
    await waitFor(() => expect(location.search).toContain('findingId=finding1'));
    act(() => window.history.back());
    await waitFor(() => expect(view.result.current.tab).toBe('research'));
    view.unmount();
    const reloaded = renderNavigation();
    expect(reloaded.result.current).toMatchObject({
      tab: 'research',
      threadId: 'thread1',
      sourceKey: 'turn1:1',
      findingId: null,
    });
  });

  it('keeps unrelated URL parameters and falls back safely for invalid views', async () => {
    window.history.replaceState(
      null,
      '',
      workspace + '?tab=invalid&checkLayout=invalid&filter=mine',
    );
    const { result } = renderNavigation();
    expect(result.current.tab).toBe('checks');
    expect(result.current.checkLayout).toBe('board');
    act(() => result.current.navigate({ tab: 'requests', checkId: null, evidenceId: null }));
    await waitFor(() => expect(location.search).toContain('tab=requests'));
    expect(new URLSearchParams(location.search).get('filter')).toBe('mine');
  });
});
