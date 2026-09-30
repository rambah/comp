import { liveWireText } from './live-wire';
import {
  Injectable,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import type { IncomingMessage, Server } from 'http';
import type { Duplex } from 'stream';
import { WebSocketServer } from 'ws';
import { z } from 'zod';
import { isTrustedOrigin } from '../../auth/auth.server';
import { AuditLiveAccess } from './live-access.service';
import { AuditLiveBus } from './live-bus.service';
import { AuditLiveConnection } from './live-connection';

@Injectable()
export class AuditLiveGateway
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly server = new WebSocketServer({
    noServer: true,
    maxPayload: 4096,
    perMessageDeflate: false,
  });
  private http?: Server;
  constructor(
    private readonly adapter: HttpAdapterHost,
    private readonly access: AuditLiveAccess,
    private readonly bus: AuditLiveBus,
  ) {}

  onApplicationBootstrap() {
    this.http = this.adapter.httpAdapter.getHttpServer() as Server;
    this.http.on('upgrade', this.handleUpgrade);
    this.server.on('connection', (socket) => {
      const deadline = setTimeout(() => socket.close(1008), 5000);
      socket.once('close', () => clearTimeout(deadline));
      socket.once('message', (raw) => {
        void (async () => {
          const { ticket } = z
            .object({ ticket: z.string().uuid() })
            .strict()
            .parse(JSON.parse(liveWireText(raw)));
          const identity = await this.bus.consume(ticket);
          if (!identity || !(await this.access.valid(identity)))
            return socket.close(1008);
          if (socket.readyState !== socket.OPEN) return;
          clearTimeout(deadline);
          new AuditLiveConnection(socket, identity, this.bus, this.access);
        })().catch(() => socket.close(1008));
      });
      socket.on('error', () => socket.close());
    });
  }

  private handleUpgrade = (
    request: IncomingMessage,
    socket: Duplex,
    head: Buffer,
  ) => {
    if (request.url?.split('?')[0] !== '/v1/audit-workspace/live/socket')
      return;
    const origin = request.headers.origin;
    // Browser origin validation is independent of the single-use session ticket.
    if (!origin) return socket.destroy();
    void isTrustedOrigin(origin)
      .then((trusted) => {
        if (!trusted || socket.destroyed) {
          socket.destroy();
          return;
        }
        this.server.handleUpgrade(request, socket, head, (ws) =>
          this.server.emit('connection', ws),
        );
      })
      .catch(() => socket.destroy());
  };

  onModuleDestroy() {
    this.http?.off('upgrade', this.handleUpgrade);
    for (const socket of this.server.clients) socket.close(1001);
    this.server.close();
  }
}
