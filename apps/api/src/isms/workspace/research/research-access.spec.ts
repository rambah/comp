import { db } from '@db';
import { resolveRolePermissions } from '../../../auth/app-access';
import { requireResearchMember } from './research-access';
import { RESEARCH_RESOURCES } from './research.types';
jest.mock('@db', () => ({ db: { member: { findFirst: jest.fn() } } }));
jest.mock('../../../auth/app-access', () => ({
  resolveRolePermissions: jest.fn(),
}));
describe('audit research access', () => {
  const args = { organizationId: 'org', memberId: 'member' };
  beforeEach(() => {
    jest
      .mocked(db.member.findFirst)
      .mockResolvedValue({ role: 'auditor' } as never);
    jest
      .mocked(resolveRolePermissions)
      .mockResolvedValue(
        Object.fromEntries(
          RESEARCH_RESOURCES.map((r) => [r, ['read', 'update']]),
        ),
      );
  });
  it('allows authorized auditors', async () => {
    await expect(
      requireResearchMember({ ...args, write: true }),
    ).resolves.toBeUndefined();
  });
  it('requires active tenant membership', async () => {
    jest.mocked(db.member.findFirst).mockResolvedValue(null);
    await expect(requireResearchMember(args)).rejects.toThrow('membership');
    expect(db.member.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'member',
          organizationId: 'org',
          isActive: true,
          deactivated: false,
        },
      }),
    );
  });
  it('allows history to read-only members but blocks generation', async () => {
    jest
      .mocked(resolveRolePermissions)
      .mockResolvedValue(
        Object.fromEntries(RESEARCH_RESOURCES.map((r) => [r, ['read']])),
      );
    await expect(requireResearchMember(args)).resolves.toBeUndefined();
    await expect(
      requireResearchMember({ ...args, write: true }),
    ).rejects.toThrow('read access');
  });
  it('blocks shared answers after source permissions are revoked', async () => {
    jest
      .mocked(resolveRolePermissions)
      .mockResolvedValue({ auditWorkspace: ['read', 'update'] });
    await expect(requireResearchMember(args)).rejects.toThrow(
      'all audit source categories',
    );
  });
});
