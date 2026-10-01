import { requireRoutePermission } from '@/lib/permissions.server';
import type { Metadata } from 'next';
import { RecordingsList } from './RecordingsList';
export const metadata: Metadata = { title: 'Auditor recordings' };
export default async function RecordingsPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  await requireRoutePermission('audits/recordings', orgId);
  return <RecordingsList organizationId={orgId} />;
}
