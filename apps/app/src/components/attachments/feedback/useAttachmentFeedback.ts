'use client';
import { apiClient } from '@/lib/api-client';
import useSWR, { useSWRConfig } from 'swr';

export interface AttachmentFeedback {
  id: string;
  attachmentId: string;
  attachmentName: string;
  attachmentAvailable: boolean;
  entityId: string;
  entityType: string;
  comment: string;
  authorName: string;
  status: 'open' | 'resolved';
  createdAt: string;
  updatedAt: string;
  responses: {
    id: string;
    comment: string;
    authorName: string;
    status: 'open' | 'resolved';
    createdAt: string;
  }[];
}
interface FeedbackPage {
  data: AttachmentFeedback[];
  count: number;
  nextOffset: number | null;
}
const base = '/v1/audit-workspace/attachment-feedback';
export function useAttachmentFeedback({
  organizationId,
  attachmentId,
  status,
  offset = 0,
  enabled = true,
}: {
  organizationId: string;
  attachmentId?: string;
  status?: 'open' | 'resolved';
  offset?: number;
  enabled?: boolean;
}) {
  const { mutate } = useSWRConfig();
  const query = new URLSearchParams({ offset: String(offset) });
  if (attachmentId) query.set('attachmentId', attachmentId);
  if (status) query.set('status', status);
  const state = useSWR<FeedbackPage>(
    enabled && organizationId ? ['attachment-feedback', organizationId, query.toString()] : null,
    async () => {
      const res = await apiClient.get<FeedbackPage>(`${base}?${query}`, organizationId);
      if (res.error || !res.data)
        throw new Error(res.error || 'Unable to load attachment feedback.');
      return res.data;
    },
    { refreshInterval: 20000 },
  );
  const save = async ({ id, body }: { id?: string; body: unknown }) => {
    const res = await apiClient.post(
      id ? `${base}/${encodeURIComponent(id)}/responses` : base,
      body,
      organizationId,
    );
    if (res.error) throw new Error(res.error);
    await mutate(
      (key) => Array.isArray(key) && key[0] === 'attachment-feedback' && key[1] === organizationId,
    );
  };
  return { ...state, save };
}
