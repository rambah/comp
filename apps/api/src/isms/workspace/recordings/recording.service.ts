import { recordingPublicFields, listRecordingPage } from './recording-list';
import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { db } from '@db';
import type { AuthenticatedRequest } from '../../../auth/types';
import {
  permissionsGrant,
  resolveRolePermissions,
} from '../../../auth/app-access';
import type { LiveIdentity } from '../live.schema';
import {
  AuditRecordingStorage,
  type RecordingPacket,
} from './recording-storage.service';

export const RECORDING_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
@Injectable()
export class AuditRecordingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuditRecordingService.name);
  private timer?: ReturnType<typeof setInterval>;
  private cleaning = false;
  constructor(private readonly storage: AuditRecordingStorage) {}

  onModuleInit() {
    this.timer = setInterval(
      () =>
        void this.cleanup().catch(() =>
          this.logger.error('Recording expiry cleanup failed'),
        ),
      60_000,
    );
    this.timer.unref();
    void this.cleanup().catch(() =>
      this.logger.error('Recording expiry cleanup failed'),
    );
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async create(identity: LiveIdentity) {
    if (identity.mode !== 'publish') throw new ForbiddenException();
    return db.auditRecording.create({
      data: {
        organizationId: identity.organizationId,
        memberId: identity.memberId,
        auditorName: identity.name,
        expiresAt: new Date(Date.now() + RECORDING_RETENTION_MS),
      },
      select: { id: true },
    });
  }

  async append({
    id,
    index,
    packets,
  }: {
    id: string;
    index: number;
    packets: RecordingPacket[];
  }) {
    const recording = await db.auditRecording.findFirst({
      where: { id, deletedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!recording) throw new NotFoundException();
    const objectKey = `audit-recordings/${recording.organizationId}/${id}/${index}.json.gz`;
    // Register the object before uploading so failed writes are still cleaned up.
    const chunk = await db.auditRecordingChunk.create({
      data: { recordingId: id, index, objectKey, bytes: 0 },
    });
    const bytes = await this.storage.put({ key: objectKey, packets });
    try {
      await db.$transaction([
        db.auditRecordingChunk.update({
          where: { id: chunk.id },
          data: { bytes },
        }),
        db.auditRecording.update({
          where: { id, deletedAt: null },
          data: { lastEventAt: new Date() },
        }),
      ]);
    } catch (error) {
      await this.storage.remove([objectKey]);
      throw error;
    }
  }

  async finish({ id, interrupted }: { id: string; interrupted: boolean }) {
    await db.auditRecording.updateMany({
      where: { id, deletedAt: null },
      data: {
        endedAt: new Date(),
        state: interrupted ? 'interrupted' : 'complete',
      },
    });
  }

  async list({
    request,
    cursor,
  }: {
    request: AuthenticatedRequest;
    cursor?: string;
  }) {
    await this.requireAdmin(request);
    return listRecordingPage({
      organizationId: request.organizationId,
      cursor,
    });
  }

  async detail({ request, id }: { request: AuthenticatedRequest; id: string }) {
    await this.requireAdmin(request);
    const recording = await db.auditRecording.findFirst({
      where: {
        id,
        organizationId: request.organizationId,
        deletedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: {
        ...recordingPublicFields,
        chunks: {
          where: { bytes: { gt: 0 } },
          select: { index: true, bytes: true },
          orderBy: { index: 'asc' },
        },
      },
    });
    if (!recording)
      throw new NotFoundException('Recording not found or expired');
    return recording;
  }

  async chunk({
    request,
    id,
    index,
  }: {
    request: AuthenticatedRequest;
    id: string;
    index: number;
  }) {
    await this.requireAdmin(request);
    const chunk = await db.auditRecordingChunk.findFirst({
      where: {
        recordingId: id,
        index,
        bytes: { gt: 0 },
        recording: {
          organizationId: request.organizationId,
          deletedAt: null,
          expiresAt: { gt: new Date() },
        },
      },
    });
    if (!chunk)
      throw new NotFoundException('Recording chunk not found or expired');
    return this.storage.get(chunk.objectKey);
  }

  async remove({ request, id }: { request: AuthenticatedRequest; id: string }) {
    await this.detail({ request, id });
    await db.auditRecording.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    // Deny reads immediately; allow bounded in-flight uploads to settle before purging.
    return { success: true };
  }

  async requireAdmin(request: AuthenticatedRequest) {
    if (
      request.authType !== 'session' ||
      !request.userId ||
      !request.organizationId
    )
      throw new ForbiddenException();
    const member = await db.member.findFirst({
      where: {
        organizationId: request.organizationId,
        userId: request.userId,
        isActive: true,
        deactivated: false,
      },
    });
    if (!member || !request.userId) throw new ForbiddenException();
    const permissions = await resolveRolePermissions(
      request.organizationId,
      member.role.split(',').map((r) => r.trim()),
    );
    if (
      !permissionsGrant(permissions, 'auditRecording', 'read') ||
      !permissionsGrant(permissions, 'auditWorkspace', 'observe')
    )
      throw new ForbiddenException();
  }

  async cleanup() {
    if (this.cleaning) return;
    this.cleaning = true;
    try {
      await db.auditRecording.updateMany({
        where: {
          state: 'recording',
          lastEventAt: { lt: new Date(Date.now() - 120_000) },
        },
        data: { state: 'interrupted' },
      });
      const expired = await db.auditRecording.findMany({
        where: {
          OR: [
            { expiresAt: { lte: new Date() } },
            { deletedAt: { lte: new Date(Date.now() - 120_000) } },
          ],
        },
        select: { id: true },
        take: 100,
      });
      for (const recording of expired) {
        try {
          await this.purge(recording.id);
        } catch {
          this.logger.error('Recording object deletion failed; will retry');
        }
      }
      await this.removeOrphans();
    } finally {
      this.cleaning = false;
    }
  }

  private async removeOrphans() {
    // Also covers organization deletion (cascaded manifests) and a worker dying
    // between an upload and its database commit. Never touch other bucket prefixes.
    const candidates = (await this.storage.scan()).flatMap((object) => {
      const match = object.Key?.match(
        /^audit-recordings\/[^/]+\/([^/]+)\/\d+\.json\.gz$/,
      );
      return match &&
        object.LastModified &&
        object.LastModified.getTime() < Date.now() - 120_000
        ? [{ key: object.Key!, id: match[1] }]
        : [];
    });
    if (!candidates.length) return;
    const existing = await db.auditRecording.findMany({
      where: { id: { in: candidates.map((item) => item.id) } },
      select: { id: true },
    });
    const ids = new Set(existing.map((item) => item.id));
    await this.storage.remove(
      candidates.filter((item) => !ids.has(item.id)).map((item) => item.key),
    );
  }

  private async purge(id: string) {
    const chunks = await db.auditRecordingChunk.findMany({
      where: { recordingId: id },
      select: { objectKey: true },
    });
    await this.storage.remove(chunks.map((chunk) => chunk.objectKey));
    await db.auditRecording.deleteMany({ where: { id } });
  }
}
