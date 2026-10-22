import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { db } from '@db';
import { AuditWorkspaceService } from './workspace.service';
import { AuditWorkspaceRequestsService } from './workspace-requests.service';
import { AuditWorkspaceCompletion } from './workspace-completion.service';
jest.mock('@db', () => {
  const db = {
    ismsDocument: { findUnique: jest.fn(), update: jest.fn() },
    ismsAuditControl: { findFirst: jest.fn(), update: jest.fn() },
    ismsAuditFinding: {
      findFirst: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
    ismsAudit: {
      findFirst: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
    auditRequest: {
      count: jest.fn(),
      findFirst: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
    auditRequestMessage: { create: jest.fn() },
    $executeRaw: jest.fn(),
    $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(db)),
  };
  return { db };
});
jest.mock('../../auth/app-access', () => ({
  resolveRolePermissions: jest.fn(),
  permissionsGrant: jest.fn(),
}));
const mocks = jest.mocked(db);
const now = new Date('2026-09-30T12:00:00Z');
const check = {
  id: 'check1',
  documentId: 'doc1',
  auditId: 'audit1',
  updatedAt: now,
};
const actor = { name: 'Test Auditor', memberId: 'mem1' };
const args = {
  controlId: 'check1',
  organizationId: 'org1',
  actor,
  dto: { notes: 'Reviewed sample A.', expectedUpdatedAt: now.toISOString() },
};
describe('Audit workspace integrity', () => {
  const service = new AuditWorkspaceService();
  const requests = new AuditWorkspaceRequestsService();
  const completion = new AuditWorkspaceCompletion();
  beforeEach(() => {
    jest.clearAllMocks();
    (mocks.ismsDocument.findUnique as jest.Mock).mockResolvedValue({
      status: 'draft',
    });
    (mocks.ismsAuditControl.findFirst as jest.Mock).mockResolvedValue(check);
    (mocks.auditRequest.count as jest.Mock).mockResolvedValue(0);
    (mocks.ismsAuditFinding.findFirst as jest.Mock).mockResolvedValue(null);
  });
  it('scopes reviews to the organization and internal-audit document', async () => {
    (mocks.ismsAuditControl.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(service.review(args)).rejects.toThrow(NotFoundException);
    expect(mocks.ismsAuditControl.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'check1',
        audit: { document: { organizationId: 'org1', type: 'internal_audit' } },
      },
    });
    expect(mocks.ismsAuditControl.update).not.toHaveBeenCalled();
  });
  it('rejects stale autosaves instead of overwriting newer changes', async () => {
    await expect(
      service.review({
        ...args,
        dto: { ...args.dto, expectedUpdatedAt: '2026-09-29T12:00:00Z' },
      }),
    ).rejects.toThrow(ConflictException);
    expect(mocks.ismsAuditControl.update).not.toHaveBeenCalled();
  });
  it('saving draft notes clears review attribution and does not approve anything', async () => {
    await service.review(args);
    expect(mocks.ismsAuditControl.update).toHaveBeenCalledWith({
      where: { id: 'check1' },
      data: expect.objectContaining({
        result: null,
        reviewedAt: null,
        reviewedBy: null,
      }),
    });
    expect(mocks.ismsDocument.update).not.toHaveBeenCalled();
  });
  it('requires outstanding responses to be accepted before review completion', async () => {
    (mocks.auditRequest.count as jest.Mock).mockResolvedValue(1);
    await expect(
      service.review({
        ...args,
        dto: { ...args.dto, result: 'conformity_confirmed' },
      }),
    ).rejects.toThrow(BadRequestException);
  });
  it('requires a matching finding for a nonconformity', async () => {
    await expect(
      service.review({
        ...args,
        dto: { ...args.dto, result: 'nonconformity_raised' },
      }),
    ).rejects.toThrow(BadRequestException);
    (mocks.ismsAuditFinding.findFirst as jest.Mock).mockResolvedValue({
      id: 'finding1',
    });
    await service.review({
      ...args,
      dto: { ...args.dto, result: 'nonconformity_raised' },
    });
    expect(mocks.ismsAuditControl.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          result: 'nonconformity_raised',
          reviewedBy: 'Test Auditor',
        }),
      }),
    );
  });
  it('does not accept a request that has no submitted response', async () => {
    (mocks.auditRequest.findFirst as jest.Mock).mockResolvedValue({
      id: 'req1',
      control: check,
    });
    (mocks.auditRequest.findUniqueOrThrow as jest.Mock).mockResolvedValue({
      status: 'open',
      updatedAt: now,
    });
    await expect(
      requests.respond({
        requestId: 'req1',
        organizationId: 'org1',
        actor,
        dto: {
          expectedUpdatedAt: now.toISOString(),
          content: 'Looks good',
          status: 'accepted',
        },
      }),
    ).rejects.toThrow(BadRequestException);
    expect(mocks.auditRequestMessage.create).not.toHaveBeenCalled();
  });
  it('requires closure evidence and protects finding edits against conflicts', async () => {
    (mocks.ismsAuditFinding.findFirst as jest.Mock).mockResolvedValue({
      id: 'finding1',
      documentId: 'doc1',
    });
    const arg = {
      id: 'finding1',
      organizationId: 'org1',
      dto: {
        expectedUpdatedAt: now.toISOString(),
        status: 'closed' as const,
        closureEvidence: '',
      },
    };
    await expect(completion.followup(arg)).rejects.toThrow(BadRequestException);
    (mocks.ismsAuditFinding.findUniqueOrThrow as jest.Mock).mockResolvedValue({
      updatedAt: new Date('2026-10-01'),
    });
    await expect(
      completion.followup({
        ...arg,
        dto: { ...arg.dto, closureEvidence: 'Verified correction' },
      }),
    ).rejects.toThrow(ConflictException);
  });
});
