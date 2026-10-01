import {
  DeleteObjectsCommand,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { AuditRecordingStorage } from './recording-storage.service';
import { s3Client } from '../../../app/s3';
jest.mock('../../../app/s3', () => ({
  BUCKET_NAME: 'test-private',
  s3Client: { send: jest.fn() },
}));
describe('Private compressed recording storage', () => {
  const send = s3Client!.send as jest.Mock;
  const storage = new AuditRecordingStorage();
  const packets = [
    {
      kind: 'dom' as const,
      sequence: 1,
      epoch: '00000000-0000-4000-8000-000000000001',
      batch: 0,
      part: 0,
      parts: 1,
      payload: 'YWJj',
    },
  ];
  beforeEach(() => send.mockReset());
  it('round-trips encrypted private packets with bounded reads', async () => {
    await storage.put({ key: 'audit-recordings/org/rec/0.json.gz', packets });
    const command = send.mock.calls[0][0] as PutObjectCommand;
    expect(command.input.ServerSideEncryption).toBe('AES256');
    expect(command.input.ACL).toBeUndefined();
    const body = command.input.Body as Buffer;
    send.mockResolvedValueOnce({
      Body: { transformToByteArray: async () => body },
      ContentLength: body.length,
    });
    expect(await storage.get('audit-recordings/org/rec/0.json.gz')).toEqual(
      packets,
    );
    expect(send.mock.calls[1][0]).toBeInstanceOf(GetObjectCommand);
  });
  it('rejects oversized chunks before decompressing', async () => {
    const read = jest.fn();
    send.mockResolvedValue({
      Body: { transformToByteArray: read },
      ContentLength: 8_000_001,
    });
    await expect(storage.get('key')).rejects.toThrow('Invalid recording');
    expect(read).not.toHaveBeenCalled();
  });
  it('retains database cleanup responsibility when any object deletion fails', async () => {
    send.mockResolvedValueOnce({
      Errors: [{ Key: 'key', Code: 'AccessDenied' }],
    });
    await expect(storage.remove(['key'])).rejects.toThrow('incomplete');
    expect(send.mock.calls[0][0]).toBeInstanceOf(DeleteObjectsCommand);
  });
});
