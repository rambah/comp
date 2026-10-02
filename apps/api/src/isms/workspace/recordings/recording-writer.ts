import type { AuditRecordingService } from './recording.service';
import type { LiveIdentity } from '../live.schema';
import type { RecordingPacket } from './recording-storage.service';
import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';

/** Bounded, ordered archive writes independent of the number of live viewers. */
export class AuditRecordingWriter {
  private readonly logger = new Logger(AuditRecordingWriter.name);
  private readonly connectionId = randomUUID();
  private receivedPackets = 0;
  private phase = 'receive';
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
    this.log('info', 'connected_waiting_for_first_packet');
    this.timer = setInterval(() => {
      void this.enqueue(() => this.flush());
    }, 5000);
  }

  append(message: RecordingPacket) {
    return this.enqueue(async () => {
      this.phase = 'validate_packet';
      if (++this.receivedPackets === 1)
        this.log('info', 'first_packet_received');
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
    this.phase = 'create_manifest';
    if (!this.id) this.id = (await this.service.create(this.identity)).id;
    const packets = this.packets;
    this.packets = [];
    const size = packets.reduce(
      (sum, packet) => sum + packet.payload.length,
      0,
    );
    this.phase = 'store_chunk';
    await this.service.append({ id: this.id, index: this.index++, packets });
    this.bytes -= size;
    this.totalBytes += size;
    if (this.index === 1) this.log('info', 'first_chunk_stored');
  }

  private enqueue(operation: () => Promise<void>) {
    if (this.closed || this.failed) return this.chain;
    if (++this.queued > 256) {
      this.failed = true;
      this.log('error', 'queue_full');
      this.onError();
      return this.chain;
    }
    this.chain = this.chain
      .then(async () => {
        if (!this.failed) await operation();
      })
      .catch(() => {
        this.failed = true;
        this.log('error', 'recording_failed');
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
      this.log('error', 'final_flush_failed');
    }
    const interrupted = this.failed || this.batchPackets.length > 0;
    if (this.id) {
      this.phase = 'finish_manifest';
      try {
        await this.service.finish({ id: this.id, interrupted });
      } catch (error) {
        this.log('error', 'finish_failed');
        throw error;
      }
    }
    if (!this.receivedPackets) this.log('info', 'closed_without_data');
    if (this.receivedPackets)
      this.log(
        interrupted ? 'warn' : 'info',
        interrupted ? 'interrupted' : 'complete',
      );
    this.packets = [];
    this.batchPackets = [];
  }

  private log(level: 'info' | 'warn' | 'error', event: string) {
    // Correlation only: never log DOM payloads, inputs, ticket/nonce or session secrets.
    const entry = JSON.stringify({
      event,
      connectionId: this.connectionId,
      recordingId: this.id,
      organizationId: this.identity.organizationId,
      memberId: this.identity.memberId,
      phase: this.phase,
      receivedPackets: this.receivedPackets,
      storedBytes: this.totalBytes,
    });
    if (level === 'info') this.logger.log(entry);
    else this.logger[level](entry);
  }
}
