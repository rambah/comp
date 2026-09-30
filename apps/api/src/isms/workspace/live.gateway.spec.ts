import { createServer, type Server } from 'http';
import { once } from 'events';
import { randomUUID } from 'crypto';
import { WebSocket } from 'ws';
import type { HttpAdapterHost } from '@nestjs/core';
import { AuditLiveGateway } from './live.gateway';
import type { AuditLiveAccess } from './live-access.service';
import type { AuditLiveBus } from './live-bus.service';
import type { LiveIdentity } from './live.schema';
jest.mock('@db', () => ({ db: {} }));
jest.mock('../../auth/app-access', () => ({}));
jest.mock('../../auth/auth.server', () => ({
  isTrustedOrigin: (origin: string) =>
    Promise.resolve(origin === 'https://comp.example.test'),
}));
describe('Live gateway over a real WebSocket', () => {
  let http: Server;
  let gateway: AuditLiveGateway;
  let url: string;
  const sockets: WebSocket[] = [];
  const tickets = new Map<string, LiveIdentity>();
  const identity: LiveIdentity = {
    organizationId: 'org',
    memberId: 'member',
    sessionId: 'session',
    name: 'Auditor',
    mode: 'publish',
    nonce: 'consent',
  };
  const bus = {
    consume: jest.fn((ticket: string) => {
      const value = tickets.get(ticket);
      tickets.delete(ticket);
      return Promise.resolve(value);
    }),
    publish: jest.fn(() => Promise.resolve()),
  };
  const access = { valid: jest.fn(() => Promise.resolve(true)) };
  const connect = () => {
    const socket = new WebSocket(url, { origin: 'https://comp.example.test' });
    sockets.push(socket);
    return socket;
  };
  beforeEach(async () => {
    jest.clearAllMocks();
    tickets.clear();
    http = createServer();
    await new Promise<void>((resolve) => http.listen(0, '127.0.0.1', resolve));
    const address = http.address();
    if (!address || typeof address === 'string')
      throw new Error('Missing test server port');
    url = `ws://127.0.0.1:${address.port}/v1/audit-workspace/session/socket`;
    gateway = new AuditLiveGateway(
      {
        httpAdapter: { getHttpServer: () => http },
      } as unknown as HttpAdapterHost,
      access as unknown as AuditLiveAccess,
      bus as unknown as AuditLiveBus,
    );
    gateway.onApplicationBootstrap();
  });
  afterEach(async () => {
    for (const socket of sockets.splice(0)) socket.terminate();
    gateway.onModuleDestroy();
    await new Promise<void>((resolve) => http.close(() => resolve()));
  });
  it('requires a single-use ticket and rejects its replay', async () => {
    const ticket = randomUUID();
    tickets.set(ticket, identity);
    const first = connect();
    await once(first, 'open');
    const ready = once(first, 'message');
    first.send(JSON.stringify({ ticket }));
    const [raw] = await ready;
    expect(JSON.parse(String(raw))).toEqual({ kind: 'ready' });
    const second = connect();
    await once(second, 'open');
    const closed = once(second, 'close');
    second.send(JSON.stringify({ ticket }));
    const [code] = await closed;
    expect(code).toBe(1008);
  });
  it('forwards valid pointer data and closes on unapproved extra fields', async () => {
    const ticket = randomUUID();
    tickets.set(ticket, identity);
    const socket = connect();
    await once(socket, 'open');
    const ready = once(socket, 'message');
    socket.send(JSON.stringify({ ticket }));
    await ready;
    const forwarded = new Promise<void>((resolve) => {
      bus.publish.mockImplementationOnce(() => {
        resolve();
        return Promise.resolve();
      });
    });
    socket.send(
      JSON.stringify({
        kind: 'pointer',
        sequence: 1,
        pointer: { x: 0.5, y: 0.2, visible: true },
      }),
    );
    await forwarded;
    expect(bus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org',
        memberId: 'member',
        kind: 'pointer',
      }),
    );
    const closed = once(socket, 'close');
    socket.send(
      JSON.stringify({
        kind: 'pointer',
        sequence: 2,
        pointer: { x: 0, y: 0, visible: true },
        keypress: 'excluded',
      }),
    );
    await closed;
    expect(bus.publish).not.toHaveBeenCalledWith(
      expect.objectContaining({ keypress: 'excluded' }),
    );
  });
});
