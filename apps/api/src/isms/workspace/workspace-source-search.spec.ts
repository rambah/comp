import { BadRequestException } from '@nestjs/common';
import { db } from '@db';
import { AuditWorkspaceEvidenceService } from './workspace-evidence.service';
import type { AttachmentsService } from '../../attachments/attachments.service';
jest.mock('../../attachments/attachments.service', () => ({
  AttachmentsService: class {},
}));
jest.mock('@db', () => ({
  db: {
    attachment: { findMany: jest.fn() },
    policy: { findMany: jest.fn() },
    ismsDocument: { findMany: jest.fn() },
  },
}));

describe('Audit source pagination', () => {
  const service = new AuditWorkspaceEvidenceService({} as AttachmentsService);
  beforeEach(() => {
    jest.resetAllMocks();
    (db.policy.findMany as jest.Mock).mockResolvedValue([]);
    (db.ismsDocument.findMany as jest.Mock).mockResolvedValue([]);
    (db.attachment.findMany as jest.Mock).mockResolvedValue([]);
  });
  it('signals older sources and returns them on the next page', async () => {
    const files = Array.from({ length: 65 }, (_, index) => ({
      id: `file${index}`,
      name: `Evidence ${index}`,
      createdAt: new Date('2026-10-01'),
    }));
    (db.attachment.findMany as jest.Mock).mockImplementation(({ skip, take }) =>
      Promise.resolve(files.slice(skip, skip + take)),
    );
    const first = await service.search({ organizationId: 'org1' });
    const next = await service.search({
      organizationId: 'org1',
      offset: first.nextOffset!,
    });
    expect(first.sources).toHaveLength(50);
    expect(first.nextOffset).toBe(50);
    expect(next.sources).toHaveLength(15);
    expect(next.nextOffset).toBeNull();
    expect(
      new Set([...first.sources, ...next.sources].map((s) => s.id)).size,
    ).toBe(65);
  });
  it('applies the same scoped, stable pagination to documents and policies', async () => {
    (db.ismsDocument.findMany as jest.Mock).mockResolvedValue(
      Array.from({ length: 51 }, (_, i) => ({
        id: `d${i}`,
        title: `Document ${i}`,
        currentVersion: { version: 2 },
      })),
    );
    const result = await service.search({
      organizationId: 'org1',
      search: 'Risk',
      offset: 50,
    });
    expect(result.nextOffset).toBe(100);
    expect(result.sources).toHaveLength(50);
    for (const model of [db.attachment, db.policy, db.ismsDocument])
      expect(model.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 50,
          take: 51,
          where: expect.objectContaining({ organizationId: 'org1' }),
          orderBy: expect.arrayContaining([{ id: 'asc' }]),
        }),
      );
  });
  it.each([-1, 1.5, NaN])('rejects invalid offsets %s', async (offset) => {
    await expect(
      service.search({ organizationId: 'org1', offset }),
    ).rejects.toThrow(BadRequestException);
    expect(db.attachment.findMany).not.toHaveBeenCalled();
  });
});
