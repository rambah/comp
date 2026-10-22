import { apiClient } from '@/lib/api-client';
import type { eventWithTime } from 'rrweb';
import { z } from 'zod';
import { decodeBatch } from '../live/dom-codec';
import type { RecordingManifest } from './recording-types';

const packetSchema = z.object({
  epoch: z.string(),
  batch: z.number().int().nonnegative(),
  part: z.number().int().nonnegative(),
  parts: z.number().int().min(1).max(256),
  payload: z.string().max(24000),
});

export async function loadRecording({
  organizationId,
  id,
  signal,
  onProgress,
}: {
  organizationId: string;
  id: string;
  signal: AbortSignal;
  onProgress: (percent: number) => void;
}): Promise<eventWithTime[]> {
  const options = { organizationId, signal, cache: 'no-store' as const };
  const manifest = await apiClient.call<RecordingManifest>(`/v1/audit-recordings/${id}`, options);
  if (manifest.error || !manifest.data) throw new Error('Recording unavailable or expired.');
  const events: eventWithTime[] = [];
  let parts: string[] = [];
  let epoch = '';
  let batch = 0;
  let count = 0;
  let decodedSize = 0;
  for (const [position, chunk] of manifest.data.chunks.entries()) {
    signal.throwIfAborted();
    const response = await apiClient.call<{ packets: unknown }>(
      `/v1/audit-recordings/${id}/chunks/${chunk.index}`,
      options,
    );
    if (response.error || !response.data)
      throw new Error('Recording could not be loaded. Please try again.');
    for (const packet of z.array(packetSchema).max(1000).parse(response.data.packets)) {
      if (packet.epoch !== epoch) {
        if (parts.length || packet.batch !== 0 || packet.part !== 0)
          throw new Error('Recording contains a gap.');
        epoch = packet.epoch;
        batch = 0;
      }
      if (
        packet.batch !== batch ||
        packet.part !== parts.length ||
        (parts.length > 0 && packet.parts !== count)
      )
        throw new Error('Recording contains a gap.');
      count = packet.parts;
      parts.push(packet.payload);
      if (parts.length !== count) continue;
      const decoded = await decodeBatch(parts);
      decodedSize += JSON.stringify(decoded).length;
      if (decodedSize > 128_000_000 || events.length + decoded.events.length > 250_000)
        throw new Error('This recording is too large to play in this browser.');
      events.push(...decoded.events);
      parts = [];
      batch++;
    }
    onProgress(Math.round(((position + 1) / manifest.data.chunks.length) * 100));
  }
  if (parts.length || !events.some((event) => event.type === 2))
    throw new Error('Recording has no complete snapshot yet. Try again shortly.');
  // A client clock adjustment must not reorder DOM dependencies.
  let timestamp = 0;
  return events.map((event) => ({
    ...event,
    timestamp: (timestamp = Math.max(timestamp, event.timestamp)),
  }));
}
