import { readExtraRecord } from './research-extra-records';
import { db } from '@db';
import { auditScope } from '../workspace-access';
import {
  sourceText,
  type ResearchSource,
  type SourceKind,
} from './research.types';

export async function readResearchRecord({
  organizationId,
  kind,
  id,
}: {
  organizationId: string;
  kind: SourceKind;
  id: string;
}): Promise<ResearchSource | null> {
  const base = `/${encodeURIComponent(organizationId)}`;
  const wrap = ({
    title,
    version,
    url,
    content,
  }: {
    title: string;
    version: string;
    url: string;
    content: unknown;
  }): ResearchSource => ({
    kind,
    id,
    title,
    version,
    url: `${base}${url}`,
    text: sourceText(content),
  });
  if (kind === 'policy') {
    const p = await db.policy.findFirst({
      where: { id, organizationId, isArchived: false, archivedAt: null },
      select: {
        name: true,
        status: true,
        content: true,
        draftContent: true,
        updatedAt: true,
        currentVersion: true,
      },
    });
    if (!p) return null;
    return wrap({
      title: p.name,
      version: p.currentVersion
        ? `Published v${p.currentVersion.version}; draft separately labelled`
        : `Working draft · ${p.updatedAt.toISOString()}`,
      url: `/policies/${id}`,
      content: {
        status: p.status,
        published: p.currentVersion?.content,
        workingDraft: p.draftContent.length ? p.draftContent : p.content,
      },
    });
  }
  if (kind === 'document') {
    const d = await db.ismsDocument.findFirst({
      where: { id, organizationId },
      include: {
        currentVersion: true,
        contextIssues: true,
        interestedParties: true,
        interestedPartyRequirements: true,
        objectives: true,
        roles: { include: { assignments: true } },
        metrics: { include: { measurements: true } },
        reviews: { include: { inputs: true, actions: true } },
      },
    });
    if (!d) return null;
    return wrap({
      title: d.title,
      version: d.currentVersion
        ? `Published v${d.currentVersion.version}; draft separately labelled`
        : `Working draft · ${d.updatedAt.toISOString()}`,
      url: `/documents/isms/${{ isms_scope: 'scope', roles_and_responsibilities: 'roles', objectives_plan: 'objectives', interested_parties_register: 'interested-parties', interested_parties_requirements: 'requirements', leadership_commitment: 'leadership', risk_assessment_methodology: 'risk-methodology' }[d.type] ?? d.type.replaceAll('_', '-')}`,
      content: {
        publishedVersion: d.currentVersion && {
          version: d.currentVersion.version,
          publishedAt: d.currentVersion.publishedAt,
          content: d.currentVersion.contentSnapshot,
          narrative: d.currentVersion.narrative,
        },
        workingDraft: {
          status: d.status,
          narrative: d.draftNarrative,
          contextIssues: d.contextIssues,
          interestedParties: d.interestedParties,
          requirements: d.interestedPartyRequirements,
          objectives: d.objectives,
          roles: d.roles,
          metrics: d.metrics,
          reviews: d.reviews,
        },
      },
    });
  }
  if (kind === 'soa') {
    const d = await db.sOADocument.findFirst({
      where: { id, organizationId },
      include: {
        configuration: { select: { questions: true } },
        answers: {
          where: { isLatestAnswer: true },
          orderBy: { questionId: 'asc' },
        },
      },
    });
    return d
      ? wrap({
          title: 'Statement of Applicability',
          version: `v${d.version} · ${d.status} · ${d.updatedAt.toISOString()}`,
          url: '/questionnaire/soa',
          content: {
            status: d.status,
            questions: d.configuration.questions,
            answers: d.answers,
          },
        })
      : null;
  }
  if (kind === 'risk') {
    const r = await db.risk.findFirst({
      where: { id, organizationId },
      select: {
        title: true,
        description: true,
        status: true,
        likelihood: true,
        impact: true,
        residualImpact: true,
        residualLikelihood: true,
        treatmentStrategy: true,
        treatmentStrategyDescription: true,
        updatedAt: true,
      },
    });
    return r
      ? wrap({
          title: r.title,
          version: `Current · ${r.updatedAt.toISOString()}`,
          url: `/risk/${id}`,
          content: r,
        })
      : null;
  }
  if (kind === 'vendor') {
    const v = await db.vendor.findFirst({
      where: { id, organizationId },
      select: {
        name: true,
        description: true,
        status: true,
        category: true,
        complianceBadges: true,
        inherentProbability: true,
        inherentImpact: true,
        residualProbability: true,
        residualImpact: true,
        treatmentStrategy: true,
        treatmentStrategyDescription: true,
        updatedAt: true,
      },
    });
    return v
      ? wrap({
          title: v.name,
          version: `Current · ${v.updatedAt.toISOString()}`,
          url: `/vendors/${id}`,
          content: v,
        })
      : null;
  }
  if (kind === 'task') {
    const t = await db.task.findFirst({
      where: { id, organizationId, archivedAt: null },
      select: {
        title: true,
        description: true,
        status: true,
        updatedAt: true,
        frequency: true,
      },
    });
    return t
      ? wrap({
          title: t.title,
          version: `Current · ${t.updatedAt.toISOString()}`,
          url: `/tasks/${id}`,
          content: t,
        })
      : null;
  }
  if (kind === 'comment') {
    const c = await db.comment.findFirst({
      where: {
        id,
        organizationId,
        entityType: { in: ['policy', 'risk', 'vendor', 'task', 'finding'] },
      },
      select: {
        content: true,
        entityType: true,
        entityId: true,
        createdAt: true,
      },
    });
    return c
      ? wrap({
          title: `Comment on ${c.entityType}`,
          version: `Recorded ${c.createdAt.toISOString()}`,
          url: '/audits',
          content: c,
        })
      : null;
  }
  if (kind === 'audit') {
    const a = await db.ismsAudit.findFirst({
      where: { id, ...auditScope(organizationId) },
      include: {
        controls: { include: { requests: { include: { messages: true } } } },
        findings: true,
      },
    });
    return a
      ? wrap({
          title: a.reference,
          version: `Working register · ${a.updatedAt.toISOString()}`,
          url: '/audits',
          content: a,
        })
      : null;
  }
  if (kind === 'evidence') {
    const e = await db.auditEvidenceLink.findFirst({
      where: { id, control: { audit: auditScope(organizationId) } },
    });
    return e
      ? wrap({
          title: e.title,
          version: e.versionLabel,
          url: '/audits',
          content: {
            snapshot: e.snapshot,
            capturedAt: e.createdAt,
          },
        })
      : null;
  }
  return readExtraRecord({ organizationId, kind, id });
}
