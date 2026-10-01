import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { describe, expect, it, vi } from 'vitest';
import { EvidencePicker } from './EvidencePicker';

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/lib/api-client', () => ({ apiClient: { get } }));

describe('Evidence source pagination', () => {
  it('loads older files and resets pagination when searching without linking anything', async () => {
    get.mockImplementation(async (url: string) => {
      const params = new URL(url, 'https://example.test').searchParams;
      const offset = Number(params.get('offset'));
      const searching = params.get('search') === 'supplier';
      return {
        data: {
          sources: [
            {
              id: searching ? 'supplier' : `file-${offset}`,
              title: searching ? 'Supplier evidence' : `File at ${offset}`,
              type: 'attachment',
              version: 'Uploaded 2026-10-01',
            },
          ],
          nextOffset: !searching && offset === 0 ? 50 : null,
        },
      };
    });
    const update = vi.fn();
    render(
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
        <EvidencePicker
          organizationId="org1"
          controlId="check1"
          update={update}
          onClose={vi.fn()}
        />
      </SWRConfig>,
    );
    await screen.findByText('File at 0');
    fireEvent.click(screen.getByRole('button', { name: 'Load more evidence sources' }));
    await screen.findByText('File at 50');
    expect(screen.getByText('File at 0')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Load more evidence sources' }),
    ).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Search evidence sources' }), {
      target: { value: 'supplier' },
    });
    await screen.findByText('Supplier evidence');
    await waitFor(() => expect(screen.queryByText('File at 50')).not.toBeInTheDocument());
    expect(get).toHaveBeenCalledWith(
      '/v1/audit-workspace/sources?search=supplier&offset=0',
      'org1',
    );
    expect(update).not.toHaveBeenCalled();
  });
});
