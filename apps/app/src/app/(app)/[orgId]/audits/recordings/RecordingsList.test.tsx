import { apiClient } from '@/lib/api-client';
import { render, screen, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RecordingsList } from './RecordingsList';
const permission = vi.hoisted(() => ({ allowed: false }));
vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({ hasPermission: () => permission.allowed }),
}));
vi.mock('@/lib/api-client', () => ({ apiClient: { get: vi.fn(), delete: vi.fn() } }));
vi.mock('./RecordingPlayer', () => ({ RecordingPlayer: () => <div>Player</div> }));
describe('Admin-only recordings interface', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    permission.allowed = false;
  });
  const renderList = () =>
    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <RecordingsList organizationId="org" />
      </SWRConfig>,
    );
  it('renders nothing and fetches no recordings for an auditor', () => {
    const { container } = renderList();
    expect(container).toBeEmptyDOMElement();
    expect(apiClient.get).not.toHaveBeenCalled();
  });
  it('loads the correct organization for administrators', async () => {
    permission.allowed = true;
    vi.mocked(apiClient.get).mockResolvedValue({ status: 200, data: { data: [] } });
    renderList();
    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith('/v1/audit-recordings', 'org'));
    expect(await screen.findByText(/No recordings yet/)).toBeInTheDocument();
    expect(screen.getByText('Auditor recordings')).toBeInTheDocument();
  });
});
