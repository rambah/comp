import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuditFollowBar } from './AuditFollowBar';
import type { AuditLiveEvent } from './live-types';
import { useAuditDomObserver } from './useAuditDomObserver';

const socket = vi.hoisted(() => ({
  send: vi.fn(),
  onEvent: (_event: AuditLiveEvent) => {},
}));
vi.mock('./useLiveSocket', () => ({
  useLiveSocket: ({ onEvent }: { onEvent: (event: AuditLiveEvent) => void }) => {
    socket.onEvent = onEvent;
    return { connected: true, send: socket.send };
  },
}));

const presence = (nonce: string): AuditLiveEvent => ({
  kind: 'presence',
  nonce,
  name: 'Test auditor',
  memberId: 'auditor1',
  sentAt: Date.now(),
  sequence: 1,
});

function Harness() {
  const observer = useAuditDomObserver({ organizationId: 'org1', enabled: true });
  return <AuditFollowBar observer={observer} disabled={false} />;
}

describe('Following across auditor reloads', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retains the selected member while offline and subscribes to their replacement session', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    act(() => socket.onEvent(presence('first')));
    await user.click(screen.getByRole('combobox', { name: 'Follow an auditor' }));
    await user.click(await screen.findByRole('option', { name: 'Test auditor' }));
    await waitFor(() =>
      expect(socket.send).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: 'watch',
          targetNonce: 'first',
          watching: true,
        }),
      ),
    );
    act(() =>
      socket.onEvent({
        kind: 'stop',
        nonce: 'first',
        name: 'Test auditor',
        memberId: 'auditor1',
        sentAt: Date.now(),
      }),
    );
    expect(screen.getByRole('button', { name: 'Stop following' })).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveTextContent('Reconnecting auditor');
    act(() => socket.onEvent(presence('second')));
    await waitFor(() =>
      expect(socket.send).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: 'watch',
          targetNonce: 'second',
          watching: true,
          requestSnapshot: true,
        }),
      ),
    );
    expect(screen.getByRole('combobox')).toHaveTextContent('Test auditor');
    fireEvent.click(screen.getByRole('button', { name: 'Stop following' }));
    expect(screen.getByRole('combobox')).toHaveTextContent('My workspace');
  });
});
