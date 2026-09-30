import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { db } from '@db';
import { AuditWorkspaceFinish } from './workspace-finish.service';
jest.mock('@db', () => {
  const db = {
    ismsAudit: {
      findFirst: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
    ismsDocument: { findUnique: jest.fn(), update: jest.fn() },
    $executeRaw: jest.fn(),
    $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(db)),
  };
  return { db };
});
jest.mock('../../auth/app-access', () => ({ permissionsGrant: jest.fn() }));
const args = {
  id: 'a1',
  organizationId: 'o1',
  expectedUpdatedAt: '2026-09-30T12:00:00Z',
  actor: { memberId: 'mem_auditor', name: 'Test Auditor' },
};
const complete = {
  updatedAt: new Date(args.expectedUpdatedAt),
  conclusionVerdict: 'conform',
  conclusionNotes: 'Evidence supports the conclusion',
  controls: [
    {
      result: 'conformity_confirmed',
      notes: 'Examined sample A',
      requests: [],
    },
  ],
};
describe('Auditor completion', () => {
  const service = new AuditWorkspaceFinish();
  beforeEach(() => {
    jest.clearAllMocks();
    (db.ismsAudit.findFirst as jest.Mock).mockResolvedValue({
      documentId: 'd1',
    });
    (db.ismsAudit.findUniqueOrThrow as jest.Mock).mockResolvedValue(complete);
    (db.ismsDocument.findUnique as jest.Mock).mockResolvedValue({
      status: 'draft',
    });
  });
  it('records only the current auditor’s completion, without management approval', async () => {
    await service.finish(args);
    expect(db.ismsAudit.update).toHaveBeenCalledWith({
      where: { id: 'a1' },
      data: {
        status: 'complete',
        signoffAuditorName: 'Test Auditor',
        signoffAuditorDate: expect.any(Date),
      },
    });
    expect(db.ismsDocument.update).not.toHaveBeenCalled();
  });
  it('rejects automation without a named member', async () => {
    await expect(
      service.finish({
        ...args,
        actor: { memberId: null, name: 'API client' },
      }),
    ).rejects.toThrow(ForbiddenException);
  });
  it.each([
    { ...complete, conclusionVerdict: null },
    { ...complete, controls: [] },
    { ...complete, controls: [{ result: null, notes: 'Draft', requests: [] }] },
    {
      ...complete,
      controls: [{ result: 'not_sampled', notes: 'Excluded', requests: [] }],
    },
    {
      ...complete,
      controls: [
        {
          result: 'conformity_confirmed',
          notes: 'Sample',
          requests: [{ status: 'submitted' }],
        },
      ],
    },
  ])('blocks an incomplete audit', async (record) => {
    (db.ismsAudit.findUniqueOrThrow as jest.Mock).mockResolvedValue(record);
    await expect(service.finish(args)).rejects.toThrow(BadRequestException);
    expect(db.ismsAudit.update).not.toHaveBeenCalled();
  });
});
