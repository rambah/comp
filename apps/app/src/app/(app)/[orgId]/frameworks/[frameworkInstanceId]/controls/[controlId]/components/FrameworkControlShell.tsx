'use client';

import { LinkedIsmsDocuments } from '@/components/linked-isms-documents';
import type { LinkedIsmsDocument } from '@/lib/types/linked-isms-document';

import { PoliciesTable } from '@/app/(app)/[orgId]/controls/[controlId]/components/PoliciesTable';
import { TasksTable } from '@/app/(app)/[orgId]/controls/[controlId]/components/TasksTable';
import type {
  Control,
  FrameworkEditorFramework,
  FrameworkEditorRequirement,
  FrameworkInstance,
  Policy,
  RequirementMap,
  Task,
} from '@db';
import {
  PageHeader,
  PageHeaderActions,
  PageLayout,
  Stack,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@trycompai/design-system';
import { useState } from 'react';
import { DocumentsTable } from './DocumentsTable';
import { LinkDocumentTypeSheet } from './LinkDocumentTypeSheet';
import { LinkPolicySheet } from './LinkPolicySheet';
import { LinkTaskSheet } from './LinkTaskSheet';

interface DocumentRow {
  formType: string;
  submissionCount: number;
  isNotRelevant: boolean;
}

type ControlDetail = Control & {
  ismsDocumentLinks?: LinkedIsmsDocument[];
  policies: Policy[];
  tasks: Task[];
  controlDocumentTypes?: { formType: string; isNotRelevant?: boolean }[];
  requirementsMapped: (RequirementMap & {
    frameworkInstance: FrameworkInstance & {
      framework: FrameworkEditorFramework;
    };
    requirement: FrameworkEditorRequirement;
  })[];
};

interface Breadcrumb {
  label: string;
  href?: string;
  isCurrent?: boolean;
}

interface Props {
  orgId: string;
  frameworkInstanceId: string;
  control: ControlDetail;
  breadcrumbs: Breadcrumb[];
  documentRows: DocumentRow[];
}

export function FrameworkControlShell({ orgId, frameworkInstanceId, control, breadcrumbs, documentRows }: Props) {
  const [activeTab, setActiveTab] = useState('policies');

  const linkedPolicyIds = control.policies.map((p) => p.id);
  const linkedTaskIds = control.tasks.map((t) => t.id);
  const linkedFormTypes = (control.controlDocumentTypes ?? []).map((d) => d.formType);

  const actions =
    activeTab === 'policies' ? (
      <LinkPolicySheet
        controlId={control.id}
        frameworkInstanceId={frameworkInstanceId}
        alreadyLinkedPolicyIds={linkedPolicyIds}
      />
    ) : activeTab === 'tasks' ? (
      <LinkTaskSheet
        controlId={control.id}
        frameworkInstanceId={frameworkInstanceId}
        alreadyLinkedTaskIds={linkedTaskIds}
      />
    ) : activeTab === 'documents' ? (
      <LinkDocumentTypeSheet
        controlId={control.id}
        frameworkInstanceId={frameworkInstanceId}
        alreadyLinkedFormTypes={linkedFormTypes}
      />
    ) : null;

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <PageLayout
        header={
          <PageHeader title={control.name} breadcrumbs={breadcrumbs}>
            <PageHeaderActions>{actions}</PageHeaderActions>
          </PageHeader>
        }
      >
        <Stack gap="lg">
          <TabsList variant="underline">
            <TabsTrigger value="isms">ISMS documents ({control.ismsDocumentLinks?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="policies">Policies ({control.policies.length})</TabsTrigger>
            <TabsTrigger value="tasks">Tasks ({control.tasks.length})</TabsTrigger>
            <TabsTrigger value="documents">Forms ({documentRows.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="isms">
            <LinkedIsmsDocuments links={control.ismsDocumentLinks ?? []} orgId={orgId} />
          </TabsContent>

          <TabsContent value="policies">
            <PoliciesTable policies={control.policies} orgId={orgId} />
          </TabsContent>

          <TabsContent value="tasks">
            <TasksTable tasks={control.tasks} orgId={orgId} />
          </TabsContent>

          <TabsContent value="documents">
            <DocumentsTable
              controlId={control.id}
              frameworkInstanceId={frameworkInstanceId}
              orgId={orgId}
              rows={documentRows}
            />
          </TabsContent>
        </Stack>
      </PageLayout>
    </Tabs>
  );
}
