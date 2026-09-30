'use client';
import { apiClient } from '@/lib/api-client';
import { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { citationSchema, type ResearchThread, type ResearchTopics } from './research-types';
const root = '/v1/audit-workspace/research';
export function useAuditResearch({
  organizationId,
  auditId,
  threadId,
}: {
  organizationId: string;
  auditId: string;
  threadId: string | null;
}) {
  const [older, setOlder] = useState<{ threadId: string; page: ResearchThread } | null>(null);
  useEffect(() => {
    setOlder(null);
  }, [threadId]);
  const [sending, setSending] = useState(false);
  const pending = useRef<{ threadId: string; prompt: string; requestId: string } | null>(null);
  const fetcher = async <T>(path: string): Promise<T> => {
    const res = await apiClient.get<T>(path, organizationId);
    if (res.error || !res.data) throw new Error(res.error || 'Unable to load research');
    return res.data;
  };
  const topics = useSWR<ResearchTopics>(
    ['audit-research', organizationId, auditId],
    () => fetcher(`${root}/audits/${auditId}/threads`),
    { refreshInterval: 15000 },
  );
  const conversation = useSWR<ResearchThread>(
    threadId ? ['audit-research-thread', organizationId, threadId] : null,
    async () => {
      const thread = await fetcher<ResearchThread>(`${root}/threads/${threadId}`);
      return {
        ...thread,
        turns: thread.turns.map((turn) => ({
          ...turn,
          citations: citationSchema.array().catch([]).parse(turn.citations),
        })),
      };
    },
    { refreshInterval: (data) => (data?.turns.some((t) => t.status === 'running') ? 1500 : 8000) },
  );
  const create = async (title: string) => {
    const res = await apiClient.post<ResearchThread>(
      `${root}/audits/${auditId}/threads`,
      { title },
      organizationId,
    );
    if (res.error || !res.data) throw new Error(res.error || 'Unable to create research topic');
    await topics.mutate();
    return res.data.id;
  };
  const ask = async ({ id, prompt }: { id: string; prompt: string }) => {
    if (sending) return;
    setSending(true);
    // Preserve the UUID after uncertain network outcomes. The API deduplicates it atomically.
    if (pending.current?.threadId !== id || pending.current.prompt !== prompt)
      pending.current = { threadId: id, prompt, requestId: crypto.randomUUID() };
    try {
      const res = await apiClient.post(
        `${root}/threads/${id}/turns`,
        { prompt: pending.current.prompt, requestId: pending.current.requestId },
        organizationId,
      );
      if (res.error) throw new Error(res.error);
      pending.current = null;
      await Promise.all([conversation.mutate(), topics.mutate()]);
    } finally {
      setSending(false);
    }
  };
  const olderPage = older?.threadId === threadId ? older.page : null;
  const turns = [
    ...new Map(
      [...(olderPage?.turns ?? []), ...(conversation.data?.turns ?? [])].map((turn) => [
        turn.id,
        turn,
      ]),
    ).values(),
  ];
  const olderCursor = olderPage ? olderPage.olderCursor : conversation.data?.olderCursor;
  const loadOlder = async () => {
    if (!olderCursor || !threadId) return;
    const page = await fetcher<ResearchThread>(
      `${root}/threads/${threadId}?before=${encodeURIComponent(olderCursor)}`,
    );
    setOlder({ threadId, page: { ...page, turns: [...page.turns, ...(olderPage?.turns ?? [])] } });
  };
  return { topics, conversation, create, ask, sending, turns, olderCursor, loadOlder };
}
