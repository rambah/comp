import type { AuditRecordingService } from './recording.service';
import type { LiveIdentity } from '../live.schema';
import type { RecordingPacket } from './recording-storage.service';

/** Bounded, ordered archive writes independent of the number of live viewers. */
export class AuditRecordingWriter {
  private id: string | null = null;
  private packets: RecordingPacket[] = [];
  private bytes = 0;
  private totalBytes = 0;
  private index = 0;
  private startedAt = Date.now();
  private epoch = '';
  private batch = 0;
  private part = 0;
  private parts = 0;
  private batchPackets: RecordingPacket[] = [];
  private failed = false;
  private closed = false;
  private queued = 0;
  private chain = Promise.resolve();
  private readonly timer: ReturnType<typeof setInterval>;

  constructor(
    private readonly service: AuditRecordingService,
    private readonly identity: LiveIdentity,
    private readonly onError: () => void,
  ) {
    this.timer = setInterval(() => {
      void this.enqueue(() => this.flush());
    }, 5000);
  }

  append(message: RecordingPacket) {
    return this.enqueue(async () => {
      if (message.epoch !== this.epoch) {
        if (
          message.batch !== 0 ||
          message.part !== 0 ||
          this.batchPackets.length
        )
          throw new Error('Incomplete snapshot');
        // Every archive section begins with a full snapshot. Bound player memory
        // without interrupting the live stream or losing navigation between sections.
        if (
          this.id &&
          (Date.now() - this.startedAt > 15 * 60_000 ||
            this.totalBytes > 16_000_000)
        ) {
          await this.flush();
          await this.service.finish({ id: this.id, interrupted: false });
          this.id = null;
          this.index = 0;
          this.totalBytes = 0;
          this.startedAt = Date.now();
        }
        this.epoch = message.epoch;
        this.batch = 0;
        this.part = 0;
      }
      if (
        message.batch !== this.batch ||
        message.part !== this.part ||
        (this.part > 0 && message.parts !== this.parts)
      )
        throw new Error('Recording sequence interrupted');
      this.parts = message.parts;
      this.batchPackets.push(message);
      this.part++;
      this.bytes += message.payload.length;
      if (this.bytes > 8_000_000) throw new Error('Recording buffer full');
      if (this.part === this.parts) {
        this.packets.push(...this.batchPackets);
        this.batchPackets = [];
        this.batch++;
        this.part = 0;
        if (this.packets.length >= 256 || this.bytes > 2_000_000)
          await this.flush();
      }
    });
  }

  private async flush() {
    if (!this.packets.length) return;
    if (!this.id) this.id = (await this.service.create(this.identity)).id;
    const packets = this.packets;
    this.packets = [];
    const size = packets.reduce(
      (sum, packet) => sum + packet.payload.length,
      0,
    );
    await this.service.append({ id: this.id, index: this.index++, packets });
    this.bytes -= size;
    this.totalBytes += size;
  }

  private enqueue(operation: () => Promise<void>) {
    if (this.closed || this.failed) return this.chain;
    if (++this.queued > 256) {
      this.failed = true;
      this.onError();
      return this.chain;
    }
    this.chain = this.chain
      .then(async () => {
        if (!this.failed) await operation();
      })
      .catch(() => {
        this.failed = true;
        this.onError();
      })
      .finally(() => {
        this.queued--;
      });
    return this.chain;
  }

  private closing?: Promise<void>;
  close() {
    return (this.closing ??= this.finish());
  }
  private async finish() {
    if (this.closed) return;
    this.closed = true;
    clearInterval(this.timer);
    await this.chain;
    try {
      if (!this.failed) await this.flush();
    } catch {
      this.failed = true;
    }
    if (this.id)
      await this.service.finish({
        id: this.id,
        interrupted: this.failed || this.batchPackets.length > 0,
      });
    this.packets = [];
    this.batchPackets = [];
  }
}
