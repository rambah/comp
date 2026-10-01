import { ISMS_TYPE_META, ismsTypeToSlug } from '../documents/isms/isms-types';

export interface AuditSourceLocation {
  path: string;
  title: string;
  description: string;
  permission: string;
  group: 'Registers & evidence' | 'ISMS documents';
}

export const AUDIT_SOURCE_LOCATIONS: AuditSourceLocation[] = [
  {
    path: 'risk',
    title: 'Risks',
    description:
      'Inherent and current assessments, treatment plans, acceptance decisions and supporting evidence.',
    permission: 'risk',
  },
  {
    path: 'vendors',
    title: 'Vendors & suppliers',
    description: 'Supplier assessments, residual risk, responsibilities and supporting documents.',
    permission: 'vendor',
  },
  {
    path: 'policies',
    title: 'Policies',
    description: 'Policy content, published versions, approvals and acknowledgement records.',
    permission: 'policy',
  },
  {
    path: 'tasks',
    title: 'Tasks & evidence files',
    description: 'Implementation records, manually created tasks, attachments and comments.',
    permission: 'evidence',
  },
  {
    path: 'frameworks',
    title: 'Frameworks & requirements',
    description: 'Requirement mappings, linked controls and completion progress.',
    permission: 'framework',
  },
  {
    path: 'controls',
    title: 'Controls',
    description: 'Linked policies, tasks, evidence forms and ISMS documents.',
    permission: 'control',
  },
  {
    path: 'documents/statement-of-applicability',
    title: 'Statement of Applicability',
    description: 'Applicable controls, exclusions, justification and published versions.',
    permission: 'evidence',
  },
  {
    path: 'documents',
    title: 'Evidence forms & documents',
    description: 'Submitted forms, access reviews, meetings, diagrams and other document records.',
    permission: 'evidence',
  },
  {
    path: 'people/all',
    title: 'People & training',
    description: 'Organization members, training and policy acknowledgement records.',
    permission: 'member',
  },
  {
    path: 'cloud-tests',
    title: 'Cloud tests',
    description: 'Automated checks, findings, exceptions and supporting results.',
    permission: 'integration',
  },
  {
    path: 'settings/context-hub',
    title: 'Knowledge files',
    description: 'Organization context and uploaded files available to audit research.',
    permission: 'evidence',
  },
].map((source): AuditSourceLocation => ({ ...source, group: 'Registers & evidence' }));

AUDIT_SOURCE_LOCATIONS.push(
  ...ISMS_TYPE_META.filter((meta) => meta.detailRouteEnabled).map((meta): AuditSourceLocation => ({
    path: `documents/isms/${ismsTypeToSlug(meta.type)}`,
    title: meta.title,
    description: `Clause ${meta.clause} · ${meta.description}`,
    permission: 'evidence',
    group: 'ISMS documents',
  })),
);
