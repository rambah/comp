import { AuditLiveBus } from './live-bus.service';

const listeners = new Map<string, (event: unknown) => void>();
const unsubscribe = jest.fn(async () => undefined);
const publish = jest.fn<Promise<number>, [string, unknown]>(async () => 1);
jest.mock('@upstash/redis', () => ({
  Redis: jest.fn().mockImplementation(() => ({
    publish: (channel: string, message: unknown) => publish(channel, message),
    subscribe: () => ({
      on: (name: string, callback: (event: unknown) => void) =>
        listeners.set(name, callback),
      unsubscribe,
    }),
  })),
}));

describe('audit live transport health', () => {
  let bus: AuditLiveBus;
  const onEvent = jest.fn();
  const onError = jest.fn();
  const onReady = jest.fn();
  const previousUrl = process.env.UPSTASH_REDIS_REST_URL;
  const previousToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    listeners.clear();
    publish.mockResolvedValue(1);
    process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example.test';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-only';
    bus = new AuditLiveBus();
  });
  afterEach(() => {
    bus.onModuleDestroy();
    jest.useRealTimers();
    if (previousUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = previousUrl;
    if (previousToken === undefined)
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = previousToken;
  });

  it('keeps an idle stream alive without exposing transport messages to viewers', async () => {
    bus.subscribe({ organizationId: 'org', onEvent, onError, onReady });
    listeners.get('subscribe')?.(1);
    expect(onReady).toHaveBeenCalledTimes(1);
    for (let tick = 0; tick < 24; tick++) {
      await jest.advanceTimersByTimeAsync(15_000);
      const [channel, heartbeat] = publish.mock.calls.at(-1)!;
      expect(channel).toBe('audit-live:org');
      listeners.get('message')?.({ message: heartbeat });
    }
    expect(onError).not.toHaveBeenCalled();
    expect(onEvent).not.toHaveBeenCalled();
  });

  it('closes a silently dead stream even if publishing still succeeds', async () => {
    bus.subscribe({ organizationId: 'org', onEvent, onError, onReady });
    await jest.advanceTimersByTimeAsync(60_000);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(60_000);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('cleans up immediately after publishing fails and never leaves a timer running', async () => {
    bus.subscribe({ organizationId: 'org', onEvent, onError, onReady });
    publish.mockRejectedValueOnce(new Error('unavailable'));
    await jest.advanceTimersByTimeAsync(15_000);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('does not report errors after a normal disconnect', async () => {
    const close = bus.subscribe({
      organizationId: 'org',
      onEvent,
      onError,
      onReady,
    });
    close();
    close();
    await jest.advanceTimersByTimeAsync(60_000);
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(publish).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });
});
