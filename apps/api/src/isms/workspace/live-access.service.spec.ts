import { ForbiddenException } from '@nestjs/common';
import { db } from '@db';
import { AuditLiveAccess } from './live-access.service';
import { AuditLiveBus } from './live-bus.service';
import type { AuthenticatedRequest } from '../../auth/types';
import type { LiveIdentity } from './live.schema';
jest.mock('@db', () => ({
  db: {
    member: { findFirst: jest.fn() },
    session: { findFirst: jest.fn() },
    auditViewConsent: { findUnique: jest.fn(), upsert: jest.fn() },
  },
}));
jest.mock('../../auth/app-access', () => ({
  resolveRolePermissions: jest.fn(async (_org: string, roles: string[]) => ({
    auditWorkspace: roles.includes('owner') ? ['read', 'observe'] : ['read'],
    evidence: ['read'],
    policy: ['read'],
  })),
  permissionsGrant: (
    permissions: Record<string, string[]>,
    resource: string,
    action: string,
  ) => permissions[resource]?.includes(action),
}));
const mockDb = jest.mocked(db);
const identity: LiveIdentity = {
  organizationId: 'org_a',
  memberId: 'mem_a',
  sessionId: 'sess_a',
  name: 'Auditor',
  nonce: 'nonce-a',
  mode: 'publish',
};
const request = {
  authType: 'session',
  sessionId: 'sess_a',
  userId: 'usr_a',
  organizationId: 'org_a',
} as AuthenticatedRequest;
describe('AuditLiveAccess', () => {
  const bus = { publish: jest.fn(), ticket: jest.fn() };
  const service = new AuditLiveAccess(bus as unknown as AuditLiveBus);
  const member = {
    id: 'mem_a',
    userId: 'usr_a',
    role: 'auditor',
    user: { name: 'Auditor', email: 'a@example.com' },
    auditViewConsent: {
      allowed: true,
      noticeVersion: 1,
      sessionNonce: 'nonce-a',
    },
  };
  beforeEach(() => {
    jest.clearAllMocks();
    (mockDb.member.findFirst as jest.Mock).mockResolvedValue(member);
    (mockDb.session.findFirst as jest.Mock).mockResolvedValue({
      userId: 'usr_a',
    });
    bus.publish.mockResolvedValue(1);
    bus.ticket.mockResolvedValue({ ticket: 'single-use' });
  });
  it('requires same-organization active membership and a live session', async () => {
    expect(await service.valid(identity)).toBe(true);
    expect(mockDb.member.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'mem_a',
          organizationId: 'org_a',
          isActive: true,
          deactivated: false,
        },
      }),
    );
    (mockDb.session.findFirst as jest.Mock).mockResolvedValue(null);
    expect(await service.valid(identity)).toBe(false);
  });
  it.each([
    { allowed: false, noticeVersion: 1, sessionNonce: 'nonce-a' },
    { allowed: true, noticeVersion: 0, sessionNonce: 'nonce-a' },
    { allowed: true, noticeVersion: 1, sessionNonce: 'replaced' },
  ])('rejects withdrawn or superseded consent: %j', async (consent) => {
    (mockDb.member.findFirst as jest.Mock).mockResolvedValue({
      ...member,
      auditViewConsent: consent,
    });
    expect(await service.valid(identity)).toBe(false);
  });
  it('only allows authorized administrators to observe', async () => {
    expect(await service.valid({ ...identity, mode: 'observe' })).toBe(false);
    (mockDb.member.findFirst as jest.Mock).mockResolvedValue({
      ...member,
      role: 'owner',
    });
    expect(await service.valid({ ...identity, mode: 'observe' })).toBe(true);
  });
  it('cannot grant consent during impersonation or via API keys', async () => {
    await expect(
      service.consent({
        request: { ...request, impersonatedBy: 'owner' },
        allowed: true,
      }),
    ).rejects.toThrow(ForbiddenException);
    await expect(
      service.consent({
        request: { ...request, authType: 'api-key' },
        allowed: true,
      }),
    ).rejects.toThrow(ForbiddenException);
    expect(mockDb.auditViewConsent.upsert).not.toHaveBeenCalled();
  });
  it('persists refusal even when the live bus is down', async () => {
    (mockDb.auditViewConsent.findUnique as jest.Mock).mockResolvedValue({
      sessionNonce: 'old',
    });
    bus.publish.mockRejectedValue(new Error('transport down'));
    expect((await service.consent({ request, allowed: false })).allowed).toBe(
      false,
    );
    expect(mockDb.auditViewConsent.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { memberId: 'mem_a' },
        update: expect.objectContaining({ allowed: false }),
      }),
    );
  });
  it('does not mint an observer ticket for an auditor', async () => {
    await expect(
      service.ticket({ request, dto: { mode: 'observe' } }),
    ).rejects.toThrow(ForbiddenException);
    expect(bus.ticket).not.toHaveBeenCalled();
  });
});
