import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLiveSocket } from './useLiveSocket';
const post = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api-client', () => ({ apiClient: { post } }));
vi.mock('@/env.mjs', () => ({ env: { NEXT_PUBLIC_API_URL: 'https://api.example.test' } }));
class FakeSocket {
  static OPEN = 1;
  static instances: FakeSocket[] = [];
  readyState = 1;
  bufferedAmount = 0;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  send = vi.fn();
  close = vi.fn(() => {
    this.readyState = 3;
    this.onclose?.();
  });
  constructor(public url: string) {
    FakeSocket.instances.push(this);
  }
}
const options = {
  organizationId: 'o1',
  mode: 'publish' as const,
  nonce: 'consent1',
  enabled: true,
};
const flush = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};
describe('Live socket lifecycle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    FakeSocket.instances = [];
    vi.stubGlobal('WebSocket', FakeSocket);
    post.mockResolvedValue({ status: 200, data: { ticket: 'single-use' } });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
  it('opens no connection before consent and never embeds tickets in URLs', async () => {
    const hook = renderHook(useLiveSocket, { initialProps: { ...options, enabled: false } });
    await flush();
    expect(post).not.toHaveBeenCalled();
    hook.rerender(options);
    await flush();
    const socket = FakeSocket.instances[0];
    expect(socket.url).toBe('wss://api.example.test/v1/audit-workspace/session/socket');
    act(() => socket.onopen?.());
    expect(socket.send).toHaveBeenCalledWith(JSON.stringify({ ticket: 'single-use' }));
    hook.unmount();
    expect(socket.close).toHaveBeenCalled();
  });
  it('does not retry after consent or permission is revoked', async () => {
    post.mockResolvedValue({ status: 403, error: 'Revoked' });
    const hook = renderHook(() => useLiveSocket(options));
    await flush();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60000);
    });
    expect(post).toHaveBeenCalledTimes(1);
    expect(FakeSocket.instances).toHaveLength(0);
    hook.unmount();
  });
  it('reconnects with a fresh ticket, discarding unsent pointer frames', async () => {
    const hook = renderHook(() => useLiveSocket(options));
    await flush();
    const socket = FakeSocket.instances[0];
    act(() => socket.onmessage?.({ data: JSON.stringify({ kind: 'ready' }) }));
    expect(hook.result.current.connected).toBe(true);
    socket.bufferedAmount = 20000;
    act(() =>
      hook.result.current.send({ kind: 'pointer', pointer: { x: 1, y: 1, visible: true } }),
    );
    expect(socket.send).not.toHaveBeenCalled();
    act(() => socket.close());
    expect(hook.result.current.connected).toBe(false);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1300);
    });
    expect(post).toHaveBeenCalledTimes(2);
    expect(FakeSocket.instances).toHaveLength(2);
    hook.unmount();
  });
  it('ignores an in-flight ticket when sharing is withdrawn', async () => {
    let resolve!: (value: unknown) => void;
    post.mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    const hook = renderHook(useLiveSocket, { initialProps: options });
    hook.rerender({ ...options, enabled: false });
    await act(async () => resolve({ status: 200, data: { ticket: 'late' } }));
    expect(FakeSocket.instances).toHaveLength(0);
    hook.unmount();
  });
});
