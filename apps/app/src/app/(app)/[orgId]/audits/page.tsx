import { serverApi } from '@/lib/api-server';
import { requireRoutePermission } from '@/lib/permissions.server';
import type { Metadata } from 'next';
import { AuditWorkspace } from './components/AuditWorkspace';
import type { WorkspaceData } from './workspace-types';

export const metadata: Metadata = { title: 'Audits' };

export default async function AuditsPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  await requireRoutePermission('audits', orgId);
  const response = await serverApi.get<WorkspaceData>('/v1/audit-workspace', orgId);
  return <AuditWorkspace organizationId={orgId} initialData={response.data ?? null} />;
}
