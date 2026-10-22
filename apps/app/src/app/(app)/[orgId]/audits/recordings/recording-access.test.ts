import { canAccessRoute, resolveBuiltInPermissions } from '@/lib/permissions';
import { describe, expect, it } from 'vitest';
describe('Recordings route permissions', () => {
  it.each(['admin', 'owner'])('allows %s', (role) => {
    expect(canAccessRoute(resolveBuiltInPermissions(role).permissions, 'audits/recordings')).toBe(
      true,
    );
  });
  it.each(['auditor', 'employee', 'contractor', null])(
    'rejects %s even for direct links',
    (role) => {
      expect(canAccessRoute(resolveBuiltInPermissions(role).permissions, 'audits/recordings')).toBe(
        false,
      );
    },
  );
  it('requires both private recording and privileged observation access', () => {
    expect(canAccessRoute({ auditRecording: ['read'] }, 'audits/recordings')).toBe(false);
  });
});
