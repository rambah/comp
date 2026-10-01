import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { db } from '@db';
import {
  AuditRecordingService,
  RECORDING_RETENTION_MS,
} from './recording.service';
import type { AuditRecordingStorage } from './recording-storage.service';
import type { AuthenticatedRequest } from '../../../auth/types';
import type { LiveIdentity } from '../live.schema';
jest.mock('@db', () => ({
  db: {
    member: { findFirst: jest.fn() },
    auditRecording: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    auditRecordingChunk: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));
jest.mock('../../../auth/app-access', () => ({
  resolveRolePermissions: jest.fn(async (_org: string, roles: string[]) =>
    roles.includes('admin')
      ? { auditRecording: ['read', 'delete'], auditWorkspace: ['observe'] }
      : { auditWorkspace: ['read'] },
  ),
  permissionsGrant: (
    permissions: Record<string, string[]>,
    resource: string,
    action: string,
  ) => permissions[resource]?.includes(action),
}));
jest.mock('./recording-storage.service', () => ({
  AuditRecordingStorage: class {},
}));
const request = {
  authType: 'session',
  userId: 'user',
  organizationId: 'org',
} as AuthenticatedRequest;
const identity = {
  mode: 'publish',
  memberId: 'mem',
  organizationId: 'org',
  name: 'Auditor',
} as LiveIdentity;
const mockDb = jest.mocked(db);
describe('Private recording access and retention', () => {
  const storage = {
    get: jest.fn(),
    put: jest.fn(),
    remove: jest.fn(),
    scan: jest.fn(),
  };
  const service = new AuditRecordingService(
    storage as unknown as AuditRecordingStorage,
  );
  beforeEach(() => {
    jest.clearAllMocks();
    (mockDb.member.findFirst as jest.Mock).mockResolvedValue({ role: 'admin' });
    (mockDb.auditRecording.findMany as jest.Mock).mockResolvedValue([]);
    (mockDb.auditRecordingChunk.findMany as jest.Mock).mockResolvedValue([]);
    storage.scan.mockResolvedValue([]);
  });
  it('rejects auditors from listing, manifests, playback chunks and deletion', async () => {
    (mockDb.member.findFirst as jest.Mock).mockResolvedValue({
      role: 'auditor',
    });
    for (const call of [
      () => service.list({ request }),
      () => service.detail({ request, id: 'rec' }),
      () => service.chunk({ request, id: 'rec', index: 0 }),
      () => service.remove({ request, id: 'rec' }),
    ]) {
      await expect(call()).rejects.toThrow(ForbiddenException);
    }
    expect(storage.get).not.toHaveBeenCalled();
    expect(storage.remove).not.toHaveBeenCalled();
  });
  it('rejects inactive or missing membership', async () => {
    (mockDb.member.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(service.list({ request })).rejects.toThrow(ForbiddenException);
    expect(mockDb.member.findFirst).toHaveBeenCalledWith({
      where: {
        organizationId: 'org',
        userId: 'user',
        isActive: true,
        deactivated: false,
      },
    });
  });
  it('scopes every playback read to the organization, expiry and deletion state', async () => {
    (mockDb.auditRecordingChunk.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(
      service.chunk({ request, id: 'other-org', index: 0 }),
    ).rejects.toThrow(NotFoundException);
    expect(mockDb.auditRecordingChunk.findFirst).toHaveBeenCalledWith({
      where: {
        recordingId: 'other-org',
        index: 0,
        bytes: { gt: 0 },
        recording: {
          organizationId: 'org',
          deletedAt: null,
          expiresAt: { gt: expect.any(Date) },
        },
      },
    });
    expect(storage.get).not.toHaveBeenCalled();
  });
  it('sets 30 days retention on creation', async () => {
    const before = Date.now();
    await service.create(identity);
    const args = (mockDb.auditRecording.create as jest.Mock).mock.calls[0][0];
    expect(args.data.expiresAt.getTime()).toBeGreaterThanOrEqual(
      before + RECORDING_RETENTION_MS,
    );
    expect(args.data.expiresAt.getTime()).toBeLessThanOrEqual(
      Date.now() + RECORDING_RETENTION_MS,
    );
    await expect(
      service.create({ ...identity, mode: 'observe' }),
    ).rejects.toThrow(ForbiddenException);
  });
  it('tombstones immediately but delays physical deletion to avoid racing an upload', async () => {
    (mockDb.auditRecording.findFirst as jest.Mock).mockResolvedValue({
      id: 'rec',
    });
    await service.remove({ request, id: 'rec' });
    expect(mockDb.auditRecording.update).toHaveBeenCalledWith({
      where: { id: 'rec' },
      data: { deletedAt: expect.any(Date) },
    });
    expect(storage.remove).not.toHaveBeenCalled();
  });
  it('deletes expired objects before deleting their manifest and retries storage failures', async () => {
    (mockDb.auditRecording.findMany as jest.Mock).mockResolvedValue([
      { id: 'rec' },
    ]);
    (mockDb.auditRecordingChunk.findMany as jest.Mock).mockResolvedValue([
      { objectKey: 'key' },
    ]);
    storage.remove.mockRejectedValueOnce(new Error('s3 down'));
    await service.cleanup();
    expect(mockDb.auditRecording.deleteMany).not.toHaveBeenCalled();
    await service.cleanup();
    expect(storage.remove).toHaveBeenLastCalledWith(['key']);
    expect(mockDb.auditRecording.deleteMany).toHaveBeenCalledWith({
      where: { id: 'rec' },
    });
  });
  it('cleans orphaned objects after org deletion without touching other data or active uploads', async () => {
    storage.scan.mockResolvedValue([
      {
        Key: 'audit-recordings/org/orphan/0.json.gz',
        LastModified: new Date(Date.now() - 180_000),
      },
      {
        Key: 'audit-recordings/org/present/0.json.gz',
        LastModified: new Date(Date.now() - 180_000),
      },
      {
        Key: 'audit-recordings/org/uploading/0.json.gz',
        LastModified: new Date(),
      },
      { Key: 'evidence/file.pdf', LastModified: new Date(0) },
    ]);
    (mockDb.auditRecording.findMany as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'present' }]);
    await service.cleanup();
    expect(storage.remove).toHaveBeenCalledWith([
      'audit-recordings/org/orphan/0.json.gz',
    ]);
  });
});
