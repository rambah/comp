import type { AuditRecordingWriter } from './recordings/recording-writer';
import { liveWireText } from './live-wire';
import { db } from '@db';
import { WebSocket } from 'ws';
import { auditScope } from './workspace-access';
import { AuditLiveAccess } from './live-access.service';
import { AuditLiveBus } from './live-bus.service';
import {
  liveMessageSchema,
  type LiveEvent,
  type LiveIdentity,
  type LiveMessage,
} from './live.schema';

/** One bounded sender per socket: slow networks discard old pointer positions. */
export class AuditLiveConnection {
  private closed = false;
  private sequence = -1;
  private viewKey = '';
  private pendingView?: LiveMessage;
  private pendingPointer?: LiveMessage;
  private publishing = false;
  private pendingDom: LiveMessage[] = [];
  private forwardChain = Promise.resolve();
  private forwardCount = 0;
  private watchWindow = { since: Date.now(), count: 0 };
  private lastPointerAt = 0;
  private stopSubscription?: () => void;
  private checking = false;
  private readonly timer: ReturnType<typeof setInterval>;
  private readonly revoked = new Set<string>();
  private readonly grants = new Map<string, number>();

  constructor(
    private readonly socket: WebSocket,
    private readonly identity: LiveIdentity,
    private readonly bus: AuditLiveBus,
    private readonly access: AuditLiveAccess,
    private readonly recording?: AuditRecordingWriter,
  ) {
    this.timer = setInterval(() => {
      void this.checkAccess();
    }, 4000);
    socket.on('close', () => this.close());
    socket.on('error', () => this.close());
    socket.on('message', (raw) => {
      try {
        this.receive(JSON.parse(liveWireText(raw)));
      } catch {
        this.close();
      }
    });
    this.stopSubscription = bus.subscribe({
      organizationId: identity.organizationId,
      onEvent: (event) => {
        if (++this.forwardCount > 256) return this.close();
        this.forwardChain = this.forwardChain
          .then(() => this.forward(event))
          .catch(() => this.close())
          .finally(() => {
            this.forwardCount--;
          });
      },
      onError: () => this.close(),
      onReady: () => this.send({ kind: 'ready' }),
    });
  }

  private send(event: unknown) {
    if (
      !this.closed &&
      this.socket.readyState === WebSocket.OPEN &&
      this.socket.bufferedAmount < 1048576
    ) {
      this.socket.send(JSON.stringify(event));
    } else if (!this.closed) this.close();
  }

  private async checkAccess() {
    if (this.checking || this.closed) return;
    this.checking = true;
    try {
      if (!(await this.access.valid(this.identity))) this.close();
      else this.send({ kind: 'heartbeat' });
    } catch {
      this.close();
    } finally {
      this.checking = false;
    }
  }

  private receive(input: unknown) {
    const parsed = liveMessageSchema.safeParse(input);
    if (!parsed.success) return this.close();
    const message = parsed.data;
    if (this.identity.mode === 'observe' && message.kind !== 'watch')
      return this.close();
    if (this.identity.mode === 'publish' && message.kind === 'watch')
      return this.close();
    if (message.kind === 'watch') {
      if (Date.now() - this.watchWindow.since > 10000)
        this.watchWindow = { since: Date.now(), count: 0 };
      if (++this.watchWindow.count > 20) return this.close();
    }
    if (message.kind === 'dom' && message.part >= message.parts)
      return this.close();
    if (message.sequence <= this.sequence) return;
    this.sequence = message.sequence;
    if (message.kind === 'dom') void this.recording?.append(message);
    if (message.kind === 'dom' || message.kind === 'watch') {
      if (this.pendingDom.length >= 256) return this.close();
      this.pendingDom.push(message);
    } else if (message.kind === 'pointer') {
      if (Date.now() - this.lastPointerAt < 40) return;
      this.lastPointerAt = Date.now();
      this.pendingPointer = message;
    } else this.pendingView = message;
    void this.flush();
  }

  private async flush() {
    if (this.publishing || this.closed) return;
    this.publishing = true;
    try {
      while (
        !this.closed &&
        (this.pendingDom.length || this.pendingView || this.pendingPointer)
      ) {
        if (this.pendingDom.length > 1) {
          await this.bus.publishMany(
            this.pendingDom.splice(0, 16).map((message) => ({
              ...message,
              organizationId: this.identity.organizationId,
              memberId: this.identity.memberId,
              name: this.identity.name,
              nonce: this.identity.nonce,
              sentAt: Date.now(),
            })),
          );
          continue;
        }
        const message =
          this.pendingDom.shift() ?? this.pendingView ?? this.pendingPointer!;
        if (message === this.pendingView) this.pendingView = undefined;
        else if (message.kind === 'pointer') this.pendingPointer = undefined;
        if (message.kind === 'view') {
          const key = JSON.stringify([
            message.view.auditId,
            message.view.checkId,
            message.view.evidenceId,
          ]);
          if (key !== this.viewKey) {
            const audit = await db.ismsAudit.findFirst({
              where: {
                id: message.view.auditId,
                ...auditScope(this.identity.organizationId),
              },
              select: {
                controls: {
                  select: { id: true, evidenceLinks: { select: { id: true } } },
                },
              },
            });
            const check = audit?.controls.find(
              (c) => c.id === message.view.checkId,
            );
            if (
              !audit ||
              (message.view.checkId && !check) ||
              (message.view.evidenceId &&
                !check?.evidenceLinks.some(
                  (e) => e.id === message.view.evidenceId,
                ))
            )
              return this.close();
            this.viewKey = key;
          }
        }
        if (this.closed) break;
        await this.bus.publish({
          ...message,
          organizationId: this.identity.organizationId,
          memberId: this.identity.memberId,
          name: this.identity.name,
          nonce: this.identity.nonce,
          sentAt: Date.now(),
        });
      }
    } catch {
      this.close();
    } finally {
      this.publishing = false;
    }
  }

  private async forward(event: LiveEvent) {
    if (
      this.closed ||
      event.organizationId !== this.identity.organizationId ||
      event.memberId === this.identity.memberId
    )
      return;
    if (event.kind === 'watch') {
      if (
        this.identity.mode === 'publish' &&
        event.targetNonce === this.identity.nonce &&
        Date.now() - event.sentAt < 10000
      )
        this.send(event);
      return;
    }
    if (this.identity.mode !== 'observe') return;
    if (event.kind === 'stop') {
      if (event.revoked) this.revoked.add(event.nonce);
      this.grants.delete(event.nonce);
      this.send(event);
      return;
    }
    if (this.revoked.has(event.nonce) || Date.now() - event.sentAt > 15000)
      return;
    if ((this.grants.get(event.nonce) ?? 0) < Date.now()) {
      const consent = await db.auditViewConsent.findFirst({
        where: {
          memberId: event.memberId,
          sessionNonce: event.nonce,
          allowed: true,
          noticeVersion: 2,
          member: {
            organizationId: this.identity.organizationId,
            isActive: true,
            deactivated: false,
          },
        },
      });
      if (!consent || this.revoked.has(event.nonce)) return;
      this.grants.set(event.nonce, Date.now() + 3000);
    }
    this.send(event);
    // Bound caches even if a workspace is open all day.
    if (this.grants.size > 100) this.grants.clear();
    if (this.revoked.size > 100) this.close();
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    clearInterval(this.timer);
    this.stopSubscription?.();
    this.socket.close(1000);
    void this.recording?.close().catch(() => undefined);
    if (this.identity.mode === 'publish') {
      void this.bus
        .publish({
          kind: 'stop',
          organizationId: this.identity.organizationId,
          memberId: this.identity.memberId,
          name: this.identity.name,
          nonce: this.identity.nonce,
          sentAt: Date.now(),
        })
        .catch(() => undefined);
    }
  }
}
