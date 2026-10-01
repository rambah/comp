import {
  Injectable,
  Logger,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Redis } from '@upstash/redis';
import { randomUUID } from 'crypto';
import type { LiveEvent, LiveIdentity } from './live.schema';

/** Redis pub/sub forwards live events across API replicas; it retains no frames. */
@Injectable()
export class AuditLiveBus implements OnModuleDestroy {
  private readonly logger = new Logger(AuditLiveBus.name);
  private redis?: Redis;
  private readonly subscriptions = new Set<() => void>();

  private client() {
    if (
      !process.env.UPSTASH_REDIS_REST_URL ||
      !process.env.UPSTASH_REDIS_REST_TOKEN
    ) {
      throw new ServiceUnavailableException(
        'Live audit views are not configured. You can continue auditing.',
      );
    }
    return (this.redis ??= new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
      retry: false,
      signal: () => AbortSignal.timeout(4000),
    }));
  }

  async ticket(identity: LiveIdentity) {
    const ticket = randomUUID();
    await this.client().set(`audit-live:ticket:${ticket}`, identity, {
      ex: 20,
    });
    return { ticket };
  }

  async consume(ticket: string) {
    return this.client().getdel<LiveIdentity>(`audit-live:ticket:${ticket}`);
  }

  async publish(event: LiveEvent) {
    await this.client().publish(`audit-live:${event.organizationId}`, event);
  }

  async publishMany(events: LiveEvent[]) {
    const pipeline = this.client().pipeline();
    for (const event of events)
      pipeline.publish(`audit-live:${event.organizationId}`, event);
    await pipeline.exec();
  }

  subscribe({
    organizationId,
    onEvent,
    onError,
    onReady,
  }: {
    organizationId: string;
    onEvent: (event: LiveEvent) => void;
    onError: () => void;
    onReady: () => void;
  }) {
    // The subscription must not inherit the short request timeout used for publishing.
    const heartbeatId = randomUUID();
    const subscription = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      retry: false,
    }).subscribe<LiveEvent | { kind: 'transport-heartbeat'; id: string }>(
      `audit-live:${organizationId}`,
    );
    let lastEcho = Date.now();
    let stopped = false;
    let sending = false;
    subscription.on('message', ({ message }) => {
      if (stopped) return;
      if (message.kind === 'transport-heartbeat') {
        if (message.id === heartbeatId) lastEcho = Date.now();
        return;
      }
      onEvent(message);
    });
    // This SDK can swallow stream read errors. Check the entire Redis round trip,
    // rather than keeping a dead subscription alive with browser-only heartbeats.
    const fail = () => {
      if (stopped) return;
      close();
      this.logger.warn('Audit live subscription interrupted; reconnecting');
      onError();
    };
    subscription.on('error', fail);
    subscription.on('subscribe', onReady);
    const timer = setInterval(() => {
      if (Date.now() - lastEcho > 45_000) return fail();
      if (sending || stopped) return;
      sending = true;
      void Promise.resolve()
        .then(() =>
          this.client().publish(`audit-live:${organizationId}`, {
            kind: 'transport-heartbeat',
            id: heartbeatId,
          }),
        )
        .catch(fail)
        .finally(() => {
          sending = false;
        });
    }, 15_000);
    timer.unref();
    const close = () => {
      if (stopped) return;
      stopped = true;
      clearInterval(timer);
      this.subscriptions.delete(close);
      void subscription.unsubscribe().catch(() => undefined);
    };
    this.subscriptions.add(close);
    return close;
  }

  onModuleDestroy() {
    for (const close of this.subscriptions) close();
  }
}
