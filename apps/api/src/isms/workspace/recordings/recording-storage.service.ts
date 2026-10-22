import { Injectable } from '@nestjs/common';
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  PutObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { gzipSync, gunzipSync } from 'node:zlib';
import { BUCKET_NAME, s3Client } from '../../../app/s3';
import { domMessageSchema } from '../live-dom.schema';
import { z } from 'zod';

export const recordingPacketsSchema = z.array(domMessageSchema).max(1000);
export type RecordingPacket = z.infer<typeof domMessageSchema>;

@Injectable()
export class AuditRecordingStorage {
  async put({ key, packets }: { key: string; packets: RecordingPacket[] }) {
    if (!s3Client || !BUCKET_NAME)
      throw new Error('Recording storage unavailable');
    const body = gzipSync(JSON.stringify(packets));
    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: body,
        ContentType: 'application/gzip',
        ServerSideEncryption: 'AES256',
      }),
      { abortSignal: AbortSignal.timeout(30_000) },
    );
    return body.length;
  }

  async get(key: string): Promise<RecordingPacket[]> {
    if (!s3Client || !BUCKET_NAME)
      throw new Error('Recording storage unavailable');
    const result = await s3Client.send(
      new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key }),
      { abortSignal: AbortSignal.timeout(30_000) },
    );
    if (!result.Body || (result.ContentLength ?? 0) > 8_000_000)
      throw new Error('Invalid recording chunk');
    const bytes = await result.Body.transformToByteArray();
    if (bytes.length > 8_000_000) throw new Error('Recording chunk too large');
    return recordingPacketsSchema.parse(
      JSON.parse(gunzipSync(bytes, { maxOutputLength: 16_000_000 }).toString()),
    );
  }

  private cursor?: string;
  async scan() {
    if (!s3Client || !BUCKET_NAME)
      throw new Error('Recording storage unavailable');
    const page = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: 'audit-recordings/',
        ContinuationToken: this.cursor,
        MaxKeys: 1000,
      }),
      { abortSignal: AbortSignal.timeout(30_000) },
    );
    this.cursor = page.NextContinuationToken;
    return page.Contents ?? [];
  }

  async remove(keys: string[]) {
    if (!keys.length) return;
    if (!s3Client || !BUCKET_NAME)
      throw new Error('Recording storage unavailable');
    for (let offset = 0; offset < keys.length; offset += 1000) {
      const result = await s3Client.send(
        new DeleteObjectsCommand({
          Bucket: BUCKET_NAME,
          Delete: {
            Objects: keys.slice(offset, offset + 1000).map((Key) => ({ Key })),
            Quiet: true,
          },
        }),
        { abortSignal: AbortSignal.timeout(30_000) },
      );
      if (result.Errors?.length)
        throw new Error('Recording removal incomplete');
    }
  }
}
