'use client';
import { apiClient } from '@/lib/api-client';
import { Button, Text } from '@trycompai/design-system';
import { Download } from '@trycompai/design-system/icons';
import useSWR from 'swr';
export function AuditPdfPreview({
  evidenceId,
  organizationId,
  title,
}: {
  evidenceId: string;
  organizationId: string;
  title: string;
}) {
  const { data, error, isLoading, mutate } = useSWR(
    ['audit-pdf', organizationId, evidenceId],
    async () => {
      const response = await apiClient.get<{ url: string; downloadUrl: string }>(
        `/v1/audit-workspace/evidence/${evidenceId}/preview`,
        organizationId,
      );
      if (response.error || !response.data) throw new Error(response.error || 'PDF unavailable');
      return response.data;
    },
    { revalidateOnFocus: false, refreshInterval: 240000 },
  );
  if (isLoading) return <Text variant="muted">Loading the captured PDF version…</Text>;
  if (error || !data)
    return (
      <div role="alert" className="space-y-3">
        <Text>The captured PDF could not be loaded. Your review is unchanged.</Text>
        <Button variant="outline" onClick={() => void mutate()}>
          Try again
        </Button>
      </div>
    );
  return (
    <div className="space-y-3">
      <Button
        variant="outline"
        size="sm"
        iconLeft={<Download size={16} />}
        render={<a href={data.downloadUrl} download />}
      >
        Download captured PDF
      </Button>
      <iframe
        title={`${title} — captured PDF`}
        src={data.url}
        className="h-[65dvh] w-full rounded-md border"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}
