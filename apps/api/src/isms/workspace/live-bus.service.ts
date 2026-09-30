import {
  Injectable,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Redis } from '@upstash/redis';
import { randomUUID } from 'crypto';
import type { LiveEvent, LiveIdentity } from './live.schema';

/** Redis pub/sub forwards live events across API replicas; it retains no frames. */
@Injectable()
export class AuditLiveBus implements OnModuleDestroy {
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
    const subscription = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      retry: false,
    }).subscribe<LiveEvent>(`audit-live:${organizationId}`);
    subscription.on('message', ({ message }) => onEvent(message));
    subscription.on('error', onError);
    subscription.on('subscribe', onReady);
    const close = () => {
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
