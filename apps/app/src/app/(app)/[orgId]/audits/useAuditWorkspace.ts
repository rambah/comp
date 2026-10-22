'use client';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import useSWR from 'swr';
import type { WorkspaceData, WorkspaceMutation } from './workspace-types';

export function useAuditWorkspace({
  organizationId,
  initialData,
}: {
  organizationId: string;
  initialData: WorkspaceData | null;
}) {
  const state = useSWR<WorkspaceData>(
    ['audit-workspace', organizationId],
    async () => {
      const res = await apiClient.get<WorkspaceData>('/v1/audit-workspace', organizationId);
      if (res.error || !res.data)
        throw new Error(res.error || 'Unable to load the audit workspace.');
      return res.data;
    },
    { fallbackData: initialData ?? undefined, refreshInterval: 20000 },
  );

  const mutate: WorkspaceMutation = async ({ path, body, method = 'post' }) => {
    const res = await apiClient[method](`/v1/audit-workspace/${path}`, body, organizationId);
    if (res.error) {
      toast.error(res.error);
      throw new Error(res.error);
    }
    await state.mutate();
  };
  return { ...state, update: mutate };
}
