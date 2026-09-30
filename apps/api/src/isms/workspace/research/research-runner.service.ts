import { savedCitation } from './research-history';
import { db, type AuditResearchTurn, type Prisma } from '@db';
import { Injectable, Logger } from '@nestjs/common';
import { openai } from '@ai-sdk/openai';
import { streamText, stepCountIs, type ModelMessage } from 'ai';
import { SOA_BATCH_PROVIDER_OPTIONS } from '../../../soa/utils/soa-model-options';
import { AuditResearchFiles } from './research-files.service';
import { createResearchTools } from './research-tools';
import {
  RESEARCH_MODEL,
  RESEARCH_SYSTEM,
  type ResearchCitation,
} from './research.types';
import { requireResearchMember } from './research-access';

export function researchHistory(turns: AuditResearchTurn[]): ModelMessage[] {
  const messages: ModelMessage[] = [];
  let remaining = 48000;
  for (const turn of turns.slice(-16).reverse()) {
    const sources = savedCitation
      .array()
      .catch([])
      .parse(turn.citations)
      .map(({ label, kind, sourceId, title, version }) => ({
        label,
        kind,
        sourceId,
        title,
        version,
      }));
    const text =
      turn.answer.slice(0, 12000) +
      (sources.length
        ? `\nHistorical source references; re-read before citing: ${JSON.stringify(sources).slice(0, 6000)}`
        : '');
    if (turn.prompt.length + text.length > remaining) break;
    remaining -= turn.prompt.length + text.length;
    const pair: ModelMessage[] = [{ role: 'user', content: turn.prompt }];
    if (turn.status === 'complete' && text)
      pair.push({ role: 'assistant', content: text });
    messages.unshift(...pair);
  }
  return messages;
}
@Injectable()
export class AuditResearchRunner {
  private readonly logger = new Logger(AuditResearchRunner.name);
  constructor(private readonly files: AuditResearchFiles) {}
  async run({
    turn,
    organizationId,
    scope,
  }: {
    turn: AuditResearchTurn;
    organizationId: string;
    scope: string;
  }) {
    const citations: ResearchCitation[] = [];
    let answer = '';
    let lastSave = 0;
    const signal = AbortSignal.timeout(300000);
    const checkAccess = () =>
      requireResearchMember({
        organizationId,
        memberId: turn.authorMemberId,
        write: true,
      });
    const where = {
      id: turn.id,
      status: 'running',
      thread: { audit: { document: { organizationId } } },
    };
    const checkpoint = async (progress: string) => {
      await db.auditResearchTurn.updateMany({
        where,
        data: {
          answer,
          progress,
          citations: citations as unknown as Prisma.InputJsonValue,
        },
      });
      lastSave = Date.now();
    };
    try {
      await checkAccess();
      const previous = await db.auditResearchTurn.findMany({
        where: {
          threadId: turn.threadId,
          thread: { audit: { document: { organizationId } } },
          createdAt: { lt: turn.createdAt },
          status: 'complete',
        },
        orderBy: { createdAt: 'desc' },
        take: 16,
      });
      const result = streamText({
        model: openai.responses(RESEARCH_MODEL),
        providerOptions: SOA_BATCH_PROVIDER_OPTIONS,
        system: `${RESEARCH_SYSTEM}\nCurrent date: ${new Date().toISOString().slice(0, 10)}\nAudit scope (untrusted context): ${scope.slice(0, 6000)}`,
        messages: [
          ...researchHistory(previous.reverse()),
          { role: 'user', content: turn.prompt },
        ],
        abortSignal: signal,
        maxOutputTokens: 8000,
        maxRetries: 1,
        stopWhen: stepCountIs(10),
        tools: createResearchTools({
          organizationId,
          files: this.files,
          signal,
          citations,
          checkAccess,
          onProgress: checkpoint,
        }),
      });
      // Consume independently of HTTP connections. Refreshing/navigating cannot lose an answer.
      for await (const event of result.fullStream) {
        if (event.type === 'error' || event.type === 'abort')
          throw new Error('Research provider failed');
        if (event.type === 'text-delta') {
          answer += event.text;
          if (answer.length > 60000) throw new Error('Research response limit');
          if (Date.now() - lastSave > 1200)
            await checkpoint('Writing a source-based answer');
        }
      }
      if (signal.aborted || (await result.finishReason) !== 'stop')
        throw new Error('Incomplete response');
      await checkAccess();
      if (!answer.trim()) throw new Error('No answer returned');
      await db.auditResearchTurn.updateMany({
        where,
        data: {
          status: 'complete',
          answer,
          citations: citations as unknown as Prisma.InputJsonValue,
          progress: 'Complete',
          completedAt: new Date(),
        },
      });
    } catch {
      // Never log prompts, documents, provider payloads, credentials or personal data.
      this.logger.warn(`Audit research interrupted: ${turn.id}`);
      await db.auditResearchTurn.updateMany({
        where,
        data: {
          status: 'failed',
          answer,
          citations: citations as unknown as Prisma.InputJsonValue,
          progress:
            'Research was interrupted. The saved partial answer is not complete. You can retry.',
          completedAt: new Date(),
        },
      });
    }
  }
}
