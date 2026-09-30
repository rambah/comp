import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuditDomReplay } from './AuditDomReplay';
import type { useAuditDomObserver } from './useAuditDomObserver';

vi.mock('rrweb', () => ({ Replayer: vi.fn(), ReplayerEvents: {} }));
vi.mock('../components/AuditPdfPreview', () => ({ AuditPdfPreview: () => null }));

function observer(): ReturnType<typeof useAuditDomObserver> {
  return {
    participants: [],
    following: 'auditor',
    setFollowing: vi.fn(),
    connected: true,
    current: null,
    ready: false,
    consume: { current: null },
    clearView: { current: null },
  };
}

describe('Live view fullscreen controls', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('offers Exit full screen and follows browser Escape/fullscreenchange events', async () => {
    let fullscreen: Element | null = null;
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      },
    );
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: () => fullscreen,
    });
    const { container } = render(<AuditDomReplay observer={observer()} organizationId="org1" />);
    const section = container.querySelector('section')!;
    section.requestFullscreen = vi.fn(async () => {
      fullscreen = section;
      document.dispatchEvent(new Event('fullscreenchange'));
    });
    document.exitFullscreen = vi.fn(async () => {
      fullscreen = null;
      document.dispatchEvent(new Event('fullscreenchange'));
    });
    fireEvent.click(screen.getByRole('button', { name: 'Expand view' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Exit full screen' }));
    await waitFor(() => expect(document.exitFullscreen).toHaveBeenCalledOnce());
    expect(screen.getByRole('button', { name: 'Expand view' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Expand view' }));
    await screen.findByRole('button', { name: 'Exit full screen' });
    act(() => {
      fullscreen = null;
      document.dispatchEvent(new Event('fullscreenchange'));
    });
    expect(screen.getByRole('button', { name: 'Expand view' })).toBeInTheDocument();
  });
});
