import { permissionsGrant } from '../../auth/app-access';

export function canCoordinateAudit(permissions: Record<string, string[]>) {
  return (
    permissionsGrant(permissions, 'app', 'read') &&
    permissionsGrant(permissions, 'auditWorkspace', 'read') &&
    permissionsGrant(permissions, 'auditWorkspace', 'update') &&
    permissionsGrant(permissions, 'evidence', 'read') &&
    permissionsGrant(permissions, 'policy', 'read')
  );
}
