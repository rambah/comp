import { researchPage } from './research-history';
import { db } from '@db';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { auditScope, type WorkspaceActor } from '../workspace-access';
import { AuditResearchRunner } from './research-runner.service';
import { RESEARCH_MODEL, RESEARCH_MODEL_LABEL } from './research.types';
import type { AuditResearchPromptDto } from './research.dto';

@Injectable()
export class AuditResearchService {
  private readonly logger = new Logger(AuditResearchService.name);
  constructor(private readonly runner: AuditResearchRunner) {}
  async list({
    auditId,
    organizationId,
  }: {
    auditId: string;
    organizationId: string;
  }) {
    const audit = await db.ismsAudit.findFirst({
      where: { id: auditId, ...auditScope(organizationId) },
      select: { id: true },
    });
    if (!audit) throw new NotFoundException('Audit not found');
    return {
      model: { id: RESEARCH_MODEL, label: RESEARCH_MODEL_LABEL },
      available: !!process.env.OPENAI_API_KEY,
      threads: await db.auditResearchThread.findMany({
        where: { auditId, audit: auditScope(organizationId) },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          title: true,
          createdBy: true,
          updatedAt: true,
          _count: { select: { turns: true } },
        },
      }),
    };
  }
  async create({
    auditId,
    organizationId,
    title,
    actor,
  }: {
    auditId: string;
    organizationId: string;
    title: string;
    actor: WorkspaceActor;
  }) {
    await this.list({ auditId, organizationId });
    if (!title.trim()) throw new BadRequestException('Enter a topic');
    return db.auditResearchThread.create({
      data: { auditId, title: title.trim(), createdBy: actor.name },
    });
  }
  async get({
    threadId,
    organizationId,
    before,
  }: {
    threadId: string;
    organizationId: string;
    before?: string;
  }) {
    const thread = await db.auditResearchThread.findFirst({
      where: { id: threadId, audit: auditScope(organizationId) },
    });
    if (!thread) throw new NotFoundException('Research conversation not found');
    // A process restart cannot leave the browser spinning forever. Partial text remains intact.
    await db.auditResearchTurn.updateMany({
      where: {
        threadId,
        status: 'running',
        expiresAt: { lt: new Date() },
        thread: { audit: auditScope(organizationId) },
      },
      data: {
        status: 'failed',
        completedAt: new Date(),
        progress:
          'Research was interrupted. Your question and partial answer are saved. You can retry.',
      },
    });
    return {
      ...thread,
      ...(await researchPage({ threadId, organizationId, before })),
    };
  }

  async ask({
    threadId,
    organizationId,
    dto,
    actor,
  }: {
    threadId: string;
    organizationId: string;
    dto: AuditResearchPromptDto;
    actor: WorkspaceActor;
  }) {
    if (!actor.memberId || !dto.prompt.trim())
      throw new BadRequestException(
        'A question and active member are required',
      );
    if (!process.env.OPENAI_API_KEY)
      throw new ServiceUnavailableException('Research AI is not configured');
    const memberId = actor.memberId;
    const outcome = await db.$transaction(async (tx) => {
      // Serialize per organization across API replicas: idempotency, one turn/topic, bounded concurrency.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`audit-research:${organizationId}`}, 0))`;
      const thread = await tx.auditResearchThread.findFirst({
        where: { id: threadId, audit: auditScope(organizationId) },
        include: { audit: { select: { scope: true, criteria: true } } },
      });
      if (!thread)
        throw new NotFoundException('Research conversation not found');
      const existing = await tx.auditResearchTurn.findUnique({
        where: { threadId_requestId: { threadId, requestId: dto.requestId } },
      });
      if (existing) {
        if (
          existing.prompt !== dto.prompt.trim() ||
          existing.authorMemberId !== memberId
        )
          throw new ConflictException(
            'Request identifier already belongs to another question',
          );
        return { turn: existing, fresh: false, scope: thread.audit.scope };
      }
      const active = await tx.auditResearchTurn.findMany({
        where: {
          status: 'running',
          expiresAt: { gt: new Date() },
          thread: { audit: auditScope(organizationId) },
        },
        select: { threadId: true },
      });
      if (active.some((a) => a.threadId === threadId))
        throw new ConflictException(
          'This conversation already has a research task in progress',
        );
      if (active.length >= 3)
        throw new ConflictException(
          'Three research tasks are already running. Try again when one finishes',
        );
      const count = await tx.auditResearchTurn.count({ where: { threadId } });
      if (count >= 100)
        throw new BadRequestException(
          'Start a new topic to continue. This conversation remains saved',
        );
      const turn = await tx.auditResearchTurn.create({
        data: {
          threadId,
          requestId: dto.requestId,
          prompt: dto.prompt.trim(),
          authorName: actor.name,
          authorMemberId: memberId,
          model: RESEARCH_MODEL,
          expiresAt: new Date(Date.now() + 360000),
        },
      });
      await tx.auditResearchThread.update({
        where: { id: threadId },
        data: { updatedAt: new Date() },
      });
      return {
        turn,
        fresh: true,
        scope: `Current audit ID: ${thread.auditId}\n${thread.audit.scope}\nCriteria: ${thread.audit.criteria}`,
      };
    });
    if (outcome.fresh)
      void this.runner
        .run({ turn: outcome.turn, organizationId, scope: outcome.scope })
        .catch(() =>
          this.logger.warn(
            `Research persistence unavailable: ${outcome.turn.id}`,
          ),
        );
    return { runId: outcome.turn.id, threadId, status: outcome.turn.status };
  }
}
