import { NotFoundException } from '@nestjs/common';
import { db } from '@db';
import { AuditWorkspaceEvidenceService } from './workspace-evidence.service';
import type { AttachmentsService } from '../../attachments/attachments.service';
jest.mock('../../attachments/attachments.service', () => ({
  AttachmentsService: class {},
}));
jest.mock('@db', () => ({
  db: {
    auditEvidenceLink: { findFirst: jest.fn() },
    policyVersion: { findFirst: jest.fn() },
    ismsDocumentVersion: { findFirst: jest.fn() },
  },
}));
describe('Captured audit PDF', () => {
  const files = {
    getPresignedInlinePdfUrl: jest.fn(async () => 'preview'),
    getPresignedDownloadUrlWithFilename: jest.fn(async () => 'download'),
  };
  const service = new AuditWorkspaceEvidenceService(
    files as unknown as AttachmentsService,
  );
  beforeEach(() => jest.clearAllMocks());
  it('resolves the exact captured version scoped to its source and tenant', async () => {
    (db.auditEvidenceLink.findFirst as jest.Mock).mockResolvedValue({
      snapshot: { versionId: 'v2' },
      sourceType: 'policy',
      sourceId: 'p1',
      title: 'Policy',
    });
    (db.policyVersion.findFirst as jest.Mock).mockResolvedValue({
      pdfUrl: 'retained-v2.pdf',
    });
    expect(await service.preview({ id: 'e1', organizationId: 'o1' })).toEqual({
      url: 'preview',
      downloadUrl: 'download',
    });
    expect(db.policyVersion.findFirst).toHaveBeenCalledWith({
      where: { id: 'v2', policy: { id: 'p1', organizationId: 'o1' } },
      select: { pdfUrl: true },
    });
    expect(files.getPresignedInlinePdfUrl).toHaveBeenCalledWith(
      'retained-v2.pdf',
    );
  });
  it('never silently substitutes today’s PDF for a missing historical file', async () => {
    (db.auditEvidenceLink.findFirst as jest.Mock).mockResolvedValue({
      snapshot: { versionId: 'v2' },
      sourceType: 'policy',
      sourceId: 'p1',
      title: 'Policy',
    });
    (db.policyVersion.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(
      service.preview({ id: 'e1', organizationId: 'o1' }),
    ).rejects.toThrow(NotFoundException);
    expect(files.getPresignedInlinePdfUrl).not.toHaveBeenCalled();
  });
  it('does not sign files when the evidence link is outside the tenant', async () => {
    (db.auditEvidenceLink.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(
      service.preview({ id: 'e1', organizationId: 'other' }),
    ).rejects.toThrow(NotFoundException);
    expect(files.getPresignedInlinePdfUrl).not.toHaveBeenCalled();
  });
});
