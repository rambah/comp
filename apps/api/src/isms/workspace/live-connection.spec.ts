import { EventEmitter } from 'events';
import { WebSocket } from 'ws';
import { db } from '@db';
import { AuditLiveConnection } from './live-connection';
import type { AuditLiveAccess } from './live-access.service';
import type { AuditLiveBus } from './live-bus.service';
import type { LiveIdentity, LiveEvent } from './live.schema';
jest.mock('@db', () => ({
  db: {
    ismsAudit: { findFirst: jest.fn() },
    auditViewConsent: { findFirst: jest.fn() },
  },
}));
const identity: LiveIdentity = {
  organizationId: 'org1',
  memberId: 'mem1',
  sessionId: 'ses1',
  name: 'Emily',
  mode: 'publish',
  nonce: 'n1',
};
const settle = async () => {
  for (let i = 0; i < 12; i++) await Promise.resolve();
};
class Socket extends EventEmitter {
  readyState = WebSocket.OPEN;
  bufferedAmount = 0;
  send = jest.fn();
  close = jest.fn();
}
describe('Bounded live audit connection', () => {
  let socket: Socket;
  let connection: AuditLiveConnection;
  let receive: (event: LiveEvent) => void;
  const bus = { publish: jest.fn(), subscribe: jest.fn() };
  const access = { valid: jest.fn() };
  const connect = (mode: 'observe' | 'publish' = 'publish') => {
    connection = new AuditLiveConnection(
      socket as unknown as WebSocket,
      { ...identity, mode },
      bus as unknown as AuditLiveBus,
      access as unknown as AuditLiveAccess,
    );
  };
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    socket = new Socket();
    bus.publish.mockResolvedValue(1);
    access.valid.mockResolvedValue(true);
    bus.subscribe.mockImplementation(({ onEvent, onReady }) => {
      receive = onEvent;
      onReady();
      return jest.fn();
    });
    (db.ismsAudit.findFirst as jest.Mock).mockResolvedValue({
      controls: [{ id: 'c1', evidenceLinks: [] }],
    });
    (db.auditViewConsent.findFirst as jest.Mock).mockResolvedValue({
      allowed: true,
    });
  });
  afterEach(() => {
    connection?.close();
    jest.useRealTimers();
  });
  it('rejects a check or evidence belonging to another audit', async () => {
    connect();
    socket.emit(
      'message',
      JSON.stringify({
        kind: 'view',
        sequence: 1,
        view: {
          auditId: 'a1',
          tab: 'checks',
          checkId: 'outside',
          evidenceId: null,
          scrollRatio: 0,
        },
      }),
    );
    await settle();
    expect(socket.close).toHaveBeenCalled();
    expect(bus.publish).not.toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'view' }),
    );
    expect(db.ismsAudit.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'a1',
          document: { organizationId: 'org1', type: 'internal_audit' },
        },
      }),
    );
  });
  it('rejects arbitrary payload fields and invalid pointer coordinates', () => {
    connect();
    socket.emit(
      'message',
      JSON.stringify({
        kind: 'pointer',
        sequence: 1,
        pointer: { x: 2, y: 0, visible: true },
        keypress: 'secret',
      }),
    );
    expect(socket.close).toHaveBeenCalled();
  });
  it('coalesces pointer movements while a network send is blocked', async () => {
    let release!: () => void;
    bus.publish.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    connect();
    for (let i = 1; i <= 10; i++) {
      jest.setSystemTime(Date.now() + 50);
      socket.emit(
        'message',
        JSON.stringify({
          kind: 'pointer',
          sequence: i,
          pointer: { x: i / 10, y: 0, visible: true },
        }),
      );
    }
    expect(bus.publish).toHaveBeenCalledTimes(1);
    release();
    await settle();
    expect(bus.publish).toHaveBeenCalledTimes(2);
    expect(bus.publish).toHaveBeenLastCalledWith(
      expect.objectContaining({ sequence: 10 }),
    );
  });
  it('closes on access revocation and publishes a stop', async () => {
    connect();
    access.valid.mockResolvedValue(false);
    await jest.advanceTimersByTimeAsync(4000);
    expect(socket.close).toHaveBeenCalled();
    expect(bus.publish).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'stop', memberId: 'mem1' }),
    );
  });
  it('never forwards cross-tenant events or frames after explicit revocation', async () => {
    connect('observe');
    socket.send.mockClear();
    const frame: LiveEvent = {
      kind: 'pointer',
      sequence: 1,
      pointer: { x: 0.1, y: 0.5, visible: true },
      organizationId: 'org2',
      memberId: 'other',
      nonce: 'other-nonce',
      name: 'Other',
      sentAt: Date.now(),
    };
    receive(frame);
    await settle();
    expect(socket.send).not.toHaveBeenCalled();
    receive({ ...frame, organizationId: 'org1', kind: 'stop', revoked: true });
    socket.send.mockClear();
    receive({ ...frame, organizationId: 'org1' });
    await settle();
    expect(socket.send).not.toHaveBeenCalled();
  });
});
