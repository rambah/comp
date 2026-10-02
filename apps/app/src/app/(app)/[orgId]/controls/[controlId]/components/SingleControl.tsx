'use client';

import { LinkedIsmsDocuments } from '@/components/linked-isms-documents';
import type { LinkedIsmsDocument } from '@/lib/types/linked-isms-document';

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
  Stack,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@trycompai/design-system';
import { useParams } from 'next/navigation';
import type { ControlProgressResponse } from '../data/getOrganizationControlProgress';
import { PoliciesTable } from './PoliciesTable';
import { RequirementsTable } from './RequirementsTable';
import { SingleControlSkeleton } from './SingleControlSkeleton';
import { TasksTable } from './TasksTable';

interface SingleControlProps {
  control: Control & {
  ismsDocumentLinks?: LinkedIsmsDocument[];
    requirementsMapped: (RequirementMap & {
      frameworkInstance: FrameworkInstance & {
        framework: FrameworkEditorFramework;
      };
      requirement: FrameworkEditorRequirement;
    })[];
  };
  controlProgress: ControlProgressResponse;
  relatedPolicies: Policy[];
  relatedTasks: Task[];
}

export function SingleControl({
  control,
  controlProgress,
  relatedPolicies,
  relatedTasks,
}: SingleControlProps) {
  const params = useParams<{ orgId: string; controlId: string }>();
  const orgIdFromParams = params.orgId;

  if (!control || !controlProgress) {
    return <SingleControlSkeleton />;
  }

  return (
    <Tabs defaultValue="policies">
      <Stack gap="lg">
        <TabsList variant="underline">
            <TabsTrigger value="isms">ISMS documents ({control.ismsDocumentLinks?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="policies">Policies ({relatedPolicies.length})</TabsTrigger>
          <TabsTrigger value="tasks">Tasks ({relatedTasks.length})</TabsTrigger>
          <TabsTrigger value="requirements">Requirements ({control.requirementsMapped.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="isms">
            <LinkedIsmsDocuments links={control.ismsDocumentLinks ?? []} orgId={orgIdFromParams} />
          </TabsContent>

          <TabsContent value="policies">
          <PoliciesTable policies={relatedPolicies} orgId={orgIdFromParams} />
        </TabsContent>

        <TabsContent value="tasks">
          <TasksTable tasks={relatedTasks} orgId={orgIdFromParams} />
        </TabsContent>

        <TabsContent value="requirements">
          <RequirementsTable requirements={control.requirementsMapped} orgId={orgIdFromParams} />
        </TabsContent>
      </Stack>
    </Tabs>
  );
}
