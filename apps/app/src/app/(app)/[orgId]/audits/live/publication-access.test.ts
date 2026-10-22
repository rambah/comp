import { resolveBuiltInPermissions } from '@/lib/permissions';
import { describe, expect, it } from 'vitest';
import { canPublishAuditWorkspace } from './publication-access';

describe('audit recording role eligibility', () => {
  const review = {
    audit: ['read'],
    auditWorkspace: ['read', 'update', 'observe'],
    evidence: ['read'],
    policy: ['read'],
  };
  it('includes custom auditor roles without requiring the literal auditor role name', () => {
    expect(
      canPublishAuditWorkspace({
        role: 'Audit-review',
        customRolePermissions: review,
        permissions: review,
      }),
    ).toBe(true);
  });
  it('keeps the built-in auditor eligible', () => {
    expect(
      canPublishAuditWorkspace({
        role: 'auditor',
        customRolePermissions: {},
        permissions: resolveBuiltInPermissions('auditor').permissions,
      }),
    ).toBe(true);
  });
  it.each(['owner', 'admin', 'employee', 'contractor'])(
    'does not start recording ordinary %s accounts',
    (role) => {
      expect(
        canPublishAuditWorkspace({
          role,
          customRolePermissions: {},
          permissions: resolveBuiltInPermissions(role).permissions,
        }),
      ).toBe(false);
    },
  );
  it.each(['audit', 'auditWorkspace', 'evidence', 'policy'])(
    'requires existing %s access',
    (missing) => {
      const permissions = { ...review, [missing]: [] };
      expect(
        canPublishAuditWorkspace({
          role: 'Audit-review',
          customRolePermissions: permissions,
          permissions,
        }),
      ).toBe(false);
    },
  );
});
