import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuditSharingConsent } from './AuditSharingConsent';
const post = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api-client', () => ({ apiClient: { post } }));
describe('Audit sharing choice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('requires an explicit decision; Escape does not dismiss it', () => {
    const onChoice = vi.fn();
    render(
      <AuditSharingConsent organizationId="org1" open onChoice={onChoice} onPause={vi.fn()} />,
    );
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
    expect(onChoice).not.toHaveBeenCalled();
    expect(post).not.toHaveBeenCalled();
    expect(screen.getByText(/no ongoing viewer indicator/)).toBeInTheDocument();
    expect(screen.getByText(/mouse movements are transmitted live/)).toBeInTheDocument();
  });
  it('No stops broadcasting before saving and leaves the workspace usable', async () => {
    const onChoice = vi.fn();
    const onPause = vi.fn();
    post.mockImplementation(async () => {
      expect(onPause).toHaveBeenCalled();
      return { data: { allowed: false, nonce: 'new' } };
    });
    render(
      <AuditSharingConsent organizationId="org1" open onChoice={onChoice} onPause={onPause} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /No, continue/ }));
    await waitFor(() => expect(onChoice).toHaveBeenCalledWith({ allowed: false, nonce: 'new' }));
    expect(post).toHaveBeenCalledWith(
      '/v1/audit-workspace/live/consent',
      { allowed: false },
      'org1',
    );
  });
  it('a failed consent write never starts sharing', async () => {
    post.mockResolvedValue({ error: 'Unavailable' });
    const onChoice = vi.fn();
    render(
      <AuditSharingConsent organizationId="org1" open onChoice={onChoice} onPause={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Yes, allow/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Sharing is off');
    expect(onChoice).not.toHaveBeenCalled();
  });
});
