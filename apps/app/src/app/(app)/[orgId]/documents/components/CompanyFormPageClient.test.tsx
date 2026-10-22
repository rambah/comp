import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { evidenceFormDefinitions } from '../forms';
import { CompanyFormPageClient } from './CompanyFormPageClient';
const mocks = vi.hoisted(() => ({
  create: false,
  error: false,
  loading: false,
  partial: false,
  get: vi.fn(),
  retry: vi.fn(),
  fetchers: [] as (() => Promise<unknown>)[],
}));
vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({
    hasPermission: (_r: string, action: string) => action === 'read' || mocks.create,
  }),
}));
vi.mock('@/utils/auth-client', () => ({
  useActiveMember: () => ({ data: { role: 'Audit-review' } }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/lib/api-client', () => ({ api: { get: (...args: unknown[]) => mocks.get(...args) } }));
vi.mock('swr', () => ({
  useSWRConfig: () => ({ mutate: vi.fn() }),
  default: (
    key: readonly [string, string] | null,
    fetcher: (key: readonly [string, string]) => Promise<unknown>,
  ) => {
    if (key) mocks.fetchers.push(() => fetcher(key));
    const failed = mocks.error && (!mocks.partial || key?.[0].includes('risk-committee'));
    return {
      isLoading: mocks.loading,
      error: failed ? new Error('Forbidden') : null,
      mutate: mocks.retry,
      data:
        key && !failed && !mocks.loading
          ? {
              form: evidenceFormDefinitions['board-meeting'],
              submissions: [
                {
                  id: `${key[0]}-sub1`,
                  submittedAt: '2026-10-02T10:00:00Z',
                  status: 'approved',
                  submittedBy: { name: 'Owner', email: 'owner@example.com' },
                  data: { meetingMinutes: 'Reviewed access controls' },
                },
              ],
              total: 1,
            }
          : undefined,
    };
  },
}));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.create = false;
  mocks.error = false;
  mocks.loading = false;
  mocks.partial = false;
  mocks.fetchers = [];
});
afterEach(cleanup);
describe('Meeting minutes for custom audit roles', () => {
  it('shows meeting records without offering evidence creation to a read-only auditor', () => {
    render(<CompanyFormPageClient organizationId="org1" formType="meeting" />);
    expect(screen.getByRole('table')).toHaveTextContent('Reviewed access controls');
    expect(screen.queryByRole('button', { name: 'New Submission' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Upload Evidence' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeInTheDocument();
  });
  it('preserves upload/create controls for an authorized admin', () => {
    mocks.create = true;
    render(<CompanyFormPageClient organizationId="org1" formType="meeting" />);
    expect(screen.getByRole('button', { name: 'New Submission' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upload Evidence' })).toBeInTheDocument();
  });
  it('shows a loading state instead of a misleading empty state', () => {
    mocks.loading = true;
    render(<CompanyFormPageClient organizationId="org1" formType="meeting" />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading submissions');
    expect(screen.queryByText('No submissions found')).not.toBeInTheDocument();
  });
  it('shows access/load errors and retries all three meeting types', () => {
    mocks.error = true;
    render(<CompanyFormPageClient organizationId="org1" formType="meeting" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Unable to load all submissions');
    expect(screen.queryByText('No submissions found')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(mocks.retry).toHaveBeenCalledTimes(3);
  });
  it('warns when one meeting category fails instead of silently showing an incomplete list', () => {
    mocks.error = true;
    mocks.partial = true;
    render(<CompanyFormPageClient organizationId="org1" formType="meeting" />);
    expect(screen.getByRole('alert')).toHaveTextContent('incomplete');
    expect(screen.getByRole('table')).toHaveTextContent('Reviewed access controls');
  });
  it('passes the selected organization to every meeting read request', async () => {
    mocks.get.mockResolvedValue({ data: { submissions: [], total: 0 } });
    render(<CompanyFormPageClient organizationId="org1" formType="meeting" />);
    await Promise.all(mocks.fetchers.map((fetcher) => fetcher()));
    expect(mocks.get).toHaveBeenCalledWith('/v1/evidence-forms/board-meeting', 'org1');
    expect(mocks.get).toHaveBeenCalledWith('/v1/evidence-forms/it-leadership-meeting', 'org1');
    expect(mocks.get).toHaveBeenCalledWith('/v1/evidence-forms/risk-committee-meeting', 'org1');
  });
  it('keeps the upload meeting selector usable inside its dialog', async () => {
    mocks.create = true;
    render(<CompanyFormPageClient organizationId="org1" formType="meeting" />);
    fireEvent.click(screen.getByRole('button', { name: 'Upload Evidence' }));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('combobox'));
    expect(await screen.findByRole('option', { name: /Risk Committee/ })).toBeInTheDocument();
  });
});
