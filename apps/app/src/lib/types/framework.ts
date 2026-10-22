import type { LinkedIsmsDocument } from './linked-isms-document';
import type {
  Control,
  CustomFramework,
  FrameworkEditorFramework,
  FrameworkInstance,
  PolicyStatus,
  RequirementMap,
} from '@db';

export type FrameworkInstanceWithControls = FrameworkInstance & {
  framework: FrameworkEditorFramework | null;
  customFramework: CustomFramework | null;
  controls: (Control & {
    ismsDocumentLinks?: LinkedIsmsDocument[];
    controlFamily?: string | null;
    policies: Array<{
      id: string;
      name: string;
      status: PolicyStatus;
    }>;
    requirementsMapped: RequirementMap[];
    controlDocumentTypes?: Array<{
      formType: string;
      isNotRelevant?: boolean;
    }>;
  })[];
};

export interface FrameworkInstanceWithComplianceScore {
  frameworkInstance: FrameworkInstanceWithControls;
  complianceScore: number;
}
