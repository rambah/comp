import type { eventWithTime } from 'rrweb';
import { z } from 'zod';

export const pdfReferenceSchema = z
  .object({ evidenceId: z.string().max(100), title: z.string().max(500) })
  .nullable();
export type PdfReference = z.infer<typeof pdfReferenceSchema>;
export interface DomBatch {
  events: eventWithTime[];
  pdf: PdfReference;
}
const eventSchema = z
  .object({ type: z.number().int().min(0).max(6), timestamp: z.number(), data: z.unknown() })
  .passthrough();

export async function encodeBatch(batch: DomBatch) {
  const text = JSON.stringify(batch);
  if (text.length > 10000000) throw new Error('Live view too large');
  const bytes = new Uint8Array(
    await new Response(
      new Blob([text]).stream().pipeThrough(new CompressionStream('gzip')),
    ).arrayBuffer(),
  );
  let binary = '';
  for (let i = 0; i < bytes.length; i += 16384)
    binary += String.fromCharCode(...bytes.subarray(i, i + 16384));
  const encoded = btoa(binary);
  if (encoded.length > 6000000) throw new Error('Live view too large');
  return encoded.match(/.{1,24000}/g) ?? [];
}

export async function decodeBatch(parts: string[]): Promise<DomBatch> {
  const binary = atob(parts.join(''));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  const reader = new Blob([bytes])
    .stream()
    .pipeThrough(new DecompressionStream('gzip'))
    .getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 10000000) throw new Error('Live view too large');
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  const joined = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.length;
  }
  const parsed = z
    .object({ events: z.array(eventSchema).max(5000), pdf: pdfReferenceSchema })
    .parse(JSON.parse(new TextDecoder().decode(joined)));
  return { events: parsed.events as eventWithTime[], pdf: parsed.pdf };
}
