import { z } from 'zod';
export const RESEARCH_READ_RESOURCES = [
  'auditWorkspace',
  'evidence',
  'policy',
  'risk',
  'vendor',
  'task',
  'questionnaire',
  'finding',
  'control',
] as const;
export const citationSchema = z.object({
  label: z.string(),
  kind: z.string(),
  sourceId: z.string(),
  title: z.string(),
  version: z.string(),
  url: z.string(),
  excerpt: z.string(),
  retrievedAt: z.string(),
  offset: z.number(),
});
export type ResearchCitation = z.infer<typeof citationSchema>;
export interface ResearchTurn {
  id: string;
  prompt: string;
  answer: string;
  authorName: string;
  model: string;
  status: 'running' | 'complete' | 'failed';
  progress: string;
  citations: ResearchCitation[];
  createdAt: string;
}
export interface ResearchThread {
  id: string;
  title: string;
  createdBy: string;
  updatedAt: string;
  turns: ResearchTurn[];
  olderCursor: string | null;
}
export interface ResearchTopics {
  model: { id: string; label: string };
  available: boolean;
  threads: (Omit<ResearchThread, 'turns'> & { _count: { turns: number } })[];
}
export function trustedSourceUrl({ url, organizationId }: { url: string; organizationId: string }) {
  const prefix = `/${encodeURIComponent(organizationId)}/`;
  if (!url.startsWith(prefix) || /[\\\r\n]/.test(url)) return null;
  return url;
}
