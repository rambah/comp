import { db } from '@db';
import { findSimilarContent } from '../../../vector-store/lib/core/find-similar';
import { readResearchRecord } from './research-records';
import type { SourceKind } from './research.types';

export async function searchSemanticSources({
  organizationId,
  query,
}: {
  organizationId: string;
  query: string;
}) {
  try {
    const matches = await findSimilarContent(query, organizationId);
    const sources: { kind: SourceKind; id: string; title: string }[] = [];
    // The index is a discovery aid only. Re-check scope/deletion and read live content before citing.
    for (const match of matches) {
      const kind = (
        {
          policy: 'policy',
          context: 'context',
          manual_answer: 'answer',
          attachment: 'file',
          knowledge_base_document: 'knowledge',
        } as const
      )[match.sourceType === 'document_hub' ? 'attachment' : match.sourceType];
      if (kind === 'file') {
        const file = await db.attachment.findFirst({
          where: {
            id: match.sourceId,
            organizationId,
            entityType: { in: ['task', 'vendor', 'risk', 'comment'] },
          },
          select: { name: true },
        });
        if (file) sources.push({ kind, id: match.sourceId, title: file.name });
      } else if (kind === 'knowledge') {
        const file = await db.knowledgeBaseDocument.findFirst({
          where: { id: match.sourceId, organizationId },
          select: { name: true },
        });
        if (file) sources.push({ kind, id: match.sourceId, title: file.name });
      } else {
        const source = await readResearchRecord({
          organizationId,
          kind,
          id: match.sourceId,
        });
        if (source) sources.push({ kind, id: source.id, title: source.title });
      }
    }
    return {
      sources: [
        ...new Map(sources.map((s) => [`${s.kind}:${s.id}`, s])).values(),
      ],
      note: 'Optional semantic index; not exhaustive. Also use searchSources. Read each source before citing.',
    };
  } catch {
    return {
      sources: [],
      note: 'Semantic index unavailable. Use searchSources to search the current database directly.',
    };
  }
}
