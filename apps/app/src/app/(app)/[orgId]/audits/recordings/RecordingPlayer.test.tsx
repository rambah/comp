import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Replayer } from 'rrweb';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RecordingPlayer } from './RecordingPlayer';
vi.mock('./load-recording', () => ({ loadRecording: vi.fn(async () => []) }));
vi.mock('rrweb', () => ({
  Replayer: vi.fn(function () {
    return {
      iframe: document.createElement('iframe'),
      wrapper: document.createElement('div'),
      disableInteract: vi.fn(),
      on: vi.fn(),
      pause: vi.fn(),
      play: vi.fn(),
      setConfig: vi.fn(),
      getMetaData: () => ({ totalTime: 60000 }),
      getCurrentTime: () => 0,
      destroy: vi.fn(),
    };
  }),
  ReplayerEvents: { Finish: 'finish', Resize: 'resize' },
}));
describe('Recording player', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });
  it('offers play, pause, seeking and speed in a sandbox without script/form interaction', async () => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      },
    );
    const { unmount } = render(<RecordingPlayer id="rec" organizationId="org" />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Play' })).toBeEnabled());
    const replay = vi.mocked(Replayer).mock.results[0].value;
    expect(replay.iframe.getAttribute('sandbox')).toBe('allow-same-origin');
    expect(replay.iframe.hasAttribute('inert')).toBe(true);
    expect(replay.disableInteract).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(replay.play).toHaveBeenCalledWith(0);
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    expect(replay.pause).toHaveBeenCalled();
    fireEvent.change(screen.getByRole('slider'), { target: { value: '30000' } });
    expect(replay.pause).toHaveBeenCalledWith(30000);
    fireEvent.click(screen.getByRole('button', { name: '1×' }));
    expect(replay.setConfig).toHaveBeenCalledWith({ speed: 2 });
    unmount();
    expect(replay.destroy).toHaveBeenCalled();
  });
});
