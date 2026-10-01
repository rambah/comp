import { AuditRecordingWriter } from './recording-writer';
import type { AuditRecordingService } from './recording.service';
import type { RecordingPacket } from './recording-storage.service';
import type { LiveIdentity } from '../live.schema';
const identity: LiveIdentity = {
  organizationId: 'org',
  memberId: 'mem',
  sessionId: 'session',
  name: 'Auditor',
  mode: 'publish',
  nonce: 'nonce',
};
const packet = (overrides: Partial<RecordingPacket> = {}): RecordingPacket => ({
  kind: 'dom',
  sequence: 1,
  epoch: 'epoch-a',
  batch: 0,
  part: 0,
  parts: 1,
  payload: 'aGVsbG8=',
  ...overrides,
});
describe('AuditRecordingWriter', () => {
  const service = { create: jest.fn(), append: jest.fn(), finish: jest.fn() };
  let writer: AuditRecordingWriter;
  const fail = jest.fn();
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    service.create.mockResolvedValue({ id: 'recording' });
    service.append.mockResolvedValue(undefined);
    service.finish.mockResolvedValue(undefined);
    writer = new AuditRecordingWriter(
      service as unknown as AuditRecordingService,
      identity,
      fail,
    );
  });
  afterEach(async () => {
    await writer.close();
    jest.useRealTimers();
  });
  it('persists without a live observer and flushes the last complete batch on disconnect', async () => {
    await writer.append(packet());
    await writer.close();
    expect(service.create).toHaveBeenCalledWith(identity);
    expect(service.append).toHaveBeenCalledWith({
      id: 'recording',
      index: 0,
      packets: [packet()],
    });
    expect(service.finish).toHaveBeenCalledWith({
      id: 'recording',
      interrupted: false,
    });
  });
  it('does not create empty recordings', async () => {
    await writer.close();
    expect(service.create).not.toHaveBeenCalled();
  });
  it('stores complete batches only and labels an incomplete tail', async () => {
    await writer.append(packet());
    await writer.append(packet({ batch: 1, parts: 2 }));
    await writer.close();
    expect(service.append.mock.calls[0][0].packets).toEqual([packet()]);
    expect(service.finish).toHaveBeenCalledWith({
      id: 'recording',
      interrupted: true,
    });
  });
  it('serializes writes when storage is slow', async () => {
    let release: () => void = () => {};
    service.append.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    await writer.append(packet());
    jest.advanceTimersByTime(5000);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    const next = writer.append(packet({ batch: 1 }));
    expect(service.append).toHaveBeenCalledTimes(1);
    release();
    await next;
    await writer.close();
    expect(service.append.mock.calls.map((call) => call[0].index)).toEqual([
      0, 1,
    ]);
  });
  it('splits long sessions only on a new full snapshot', async () => {
    await writer.append(packet());
    await jest.advanceTimersByTimeAsync(16 * 60_000);
    await writer.append(packet({ epoch: 'epoch-b' }));
    await writer.close();
    expect(service.create).toHaveBeenCalledTimes(2);
    expect(
      service.append.mock.calls.map((call) => call[0].packets[0].epoch),
    ).toEqual(['epoch-a', 'epoch-b']);
  });
  it('fails closed on sequence gaps and storage failures', async () => {
    await writer.append(packet({ batch: 1 }));
    expect(fail).toHaveBeenCalledTimes(1);
    expect(service.append).not.toHaveBeenCalled();
  });
  it('marks a storage failure interrupted', async () => {
    service.append.mockRejectedValueOnce(new Error('storage down'));
    await writer.append(packet());
    await jest.advanceTimersByTimeAsync(5000);
    await writer.close();
    expect(fail).toHaveBeenCalledTimes(1);
    expect(service.finish).toHaveBeenCalledWith({
      id: 'recording',
      interrupted: true,
    });
  });
});
