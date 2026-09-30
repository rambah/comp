import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Replayer } from 'rrweb';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuditDomReplay } from './AuditDomReplay';
import type { useAuditDomObserver } from './useAuditDomObserver';

vi.mock('rrweb', () => ({
  Replayer: vi.fn(function () {
    return {
      iframe: document.createElement('iframe'),
      wrapper: document.createElement('div'),
      disableInteract: vi.fn(),
      on: vi.fn(),
      startLive: vi.fn(),
      addEvent: vi.fn(),
      destroy: vi.fn(),
    };
  }),
  ReplayerEvents: { FullsnapshotRebuilded: 'fullsnapshot-rebuilded' },
}));
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

  it('lets page entrance animations finish instead of freezing content at opacity zero', async () => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      },
    );
    const live = observer();
    render(<AuditDomReplay observer={live} organizationId="org1" />);
    await waitFor(() => expect(live.consume.current).not.toBeNull());
    act(() => live.consume.current?.({ events: [], pdf: null }, true));
    expect(Replayer).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        liveMode: true,
        pauseAnimation: false,
        UNSAFE_replayCanvas: false,
      }),
    );
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
