import { canAccessAuditorView, hasPermission, type UserPermissions } from '@/lib/permissions';

/** Use the same auditor eligibility as the auditor workspace, including custom roles. */
export function canPublishAuditWorkspace({
  role,
  customRolePermissions,
  permissions,
}: {
  role: string;
  customRolePermissions: UserPermissions;
  permissions: UserPermissions;
}) {
  return (
    canAccessAuditorView(role, customRolePermissions) &&
    ['auditWorkspace', 'evidence', 'policy'].every((resource) =>
      hasPermission(permissions, resource, 'read'),
    )
  );
}
