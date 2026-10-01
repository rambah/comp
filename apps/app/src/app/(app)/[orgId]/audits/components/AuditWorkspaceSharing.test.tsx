import { render, screen, waitFor } from '@testing-library/react';
import { withNuqsTestingAdapter } from 'nuqs/adapters/testing';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuditLiveProvider } from '../live/AuditLiveProvider';
import { AuditWorkspace } from './AuditWorkspace';

const { post, broadcast, hasPermission } = vi.hoisted(() => ({
  post: vi.fn(),
  broadcast: vi.fn(),
  hasPermission: vi.fn(),
}));
vi.mock('@/lib/api-client', () => ({ apiClient: { post } }));
vi.mock('@/hooks/use-permissions', () => ({ usePermissions: () => ({ hasPermission }) }));
vi.mock('@trycompai/design-system', () => ({
  PageLayout: ({ header, children }: { header: ReactNode; children: ReactNode }) => (
    <main>
      {header}
      {children}
    </main>
  ),
}));
vi.mock('../useAuditWorkspace', () => ({
  useAuditWorkspace: () => ({ data: { audits: [], members: [] }, mutate: vi.fn() }),
}));
vi.mock('../useAuditDraftGuard', () => ({ useAuditDraftGuard: vi.fn() }));
vi.mock('../live/useAuditDomBroadcast', () => ({ useAuditDomBroadcast: broadcast }));
vi.mock('../live/useAuditDomObserver', () => ({
  useAuditDomObserver: () => ({ following: null }),
}));
vi.mock('../live/AuditFollowBar', () => ({
  AuditFollowBar: () => <div>Observer controls</div>,
}));
vi.mock('../live/AuditDomReplay', () => ({ AuditDomReplay: () => null }));
vi.mock('../research/AuditResearch', () => ({ AuditResearch: () => null }));
vi.mock('./AuditWorkspaceHeader', () => ({
  AuditWorkspaceHeader: () => <h1>Audit workspace</h1>,
}));
vi.mock('./AuditWorkspaceState', () => ({ AuditWorkspaceState: () => null }));
vi.mock('./AuditSourceCatalog', () => ({ AuditSourceCatalog: () => null }));
vi.mock('./AuditWorkspaceTabs', () => ({ AuditWorkspaceTabs: () => null }));
vi.mock('./AuditCheckDetail', () => ({ AuditCheckDetail: () => null }));
vi.mock('./AuditCheckNavigator', () => ({ AuditCheckNavigator: () => null }));
vi.mock('./AuditContext', () => ({ AuditContext: () => null }));
vi.mock('./AuditEvidenceLibrary', () => ({ AuditEvidenceLibrary: () => null }));
vi.mock('./AuditFindings', () => ({ AuditFindings: () => null }));
vi.mock('./AuditQueue', () => ({ AuditQueue: () => null }));
vi.mock('./AuditReport', () => ({ AuditReport: () => null }));
vi.mock('./AuditRequests', () => ({ AuditRequests: () => null }));

describe('Auditor workspace without sharing notices', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(document, 'hasFocus').mockReturnValue(true);
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    hasPermission.mockImplementation((_, action: string) => action !== 'observe');
    post.mockResolvedValue({ data: { allowed: true, nonce: 'visit' } });
    broadcast.mockReturnValue({
      connected: true,
      viewers: ['Administrator'],
      error: 'Live view paused',
    });
  });

  it('starts automatically without a dialog, status, viewer names or sharing controls', async () => {
    render(
      <AuditLiveProvider organizationId="org1" canPublish canObserve={false}>
        <AuditWorkspace organizationId="org1" initialData={null} />
      </AuditLiveProvider>,
      { wrapper: withNuqsTestingAdapter() },
    );
    await waitFor(() =>
      expect(broadcast).toHaveBeenLastCalledWith({
        organizationId: 'org1',
        session: { allowed: true, nonce: 'visit' },
      }),
    );
    expect(screen.getByRole('main')).toHaveTextContent(/^Audit workspace$/);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps initialization failures out of the auditor interface', async () => {
    post.mockRejectedValue(new Error('Offline'));
    render(
      <AuditLiveProvider organizationId="org1" canPublish canObserve={false}>
        <AuditWorkspace organizationId="org1" initialData={null} />
      </AuditLiveProvider>,
      { wrapper: withNuqsTestingAdapter() },
    );
    await waitFor(() => expect(post).toHaveBeenCalledOnce());
    expect(screen.getByRole('main')).toHaveTextContent(/^Audit workspace$/);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('retains following controls for authorized observers', async () => {
    hasPermission.mockReturnValue(true);
    render(
      <AuditLiveProvider organizationId="org1" canPublish canObserve>
        <AuditWorkspace organizationId="org1" initialData={null} />
      </AuditLiveProvider>,
      { wrapper: withNuqsTestingAdapter() },
    );
    await waitFor(() =>
      expect(broadcast).toHaveBeenLastCalledWith({
        organizationId: 'org1',
        session: { allowed: true, nonce: 'visit' },
      }),
    );
    expect(screen.getByText('Observer controls')).toBeInTheDocument();
  });
});
