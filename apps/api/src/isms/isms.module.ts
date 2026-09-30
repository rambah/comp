import { AuditWorkspaceFinish } from './workspace/workspace-finish.service';
import { AuditWorkspaceCompletion } from './workspace/workspace-completion.service';
import { AuditLiveController } from './workspace/live.controller';
import { AuditLiveAccess } from './workspace/live-access.service';
import { AuditLiveBus } from './workspace/live-bus.service';
import { AuditLiveGateway } from './workspace/live.gateway';
import { AuditWorkspaceController } from './workspace/workspace.controller';
import { AuditWorkspaceService } from './workspace/workspace.service';
import { AuditWorkspaceRequestsService } from './workspace/workspace-requests.service';
import { AuditWorkspaceEvidenceService } from './workspace/workspace-evidence.service';
import { Module } from '@nestjs/common';
import { IsmsController } from './isms.controller';
import { IsmsRegistersController } from './isms-registers.controller';
import { IsmsService } from './isms.service';
import { IsmsContextService } from './isms-context.service';
import { IsmsVersionService } from './isms-version.service';
import { IsmsContextIssueService } from './isms-context-issue.service';
import { IsmsDocumentControlService } from './isms-document-control.service';
import { IsmsInterestedPartyService } from './isms-interested-party.service';
import { IsmsRequirementService } from './isms-requirement.service';
import { IsmsObjectiveService } from './isms-objective.service';
import { IsmsRoleService } from './isms-role.service';
import { IsmsRoleAssignmentService } from './isms-role-assignment.service';
import { IsmsMetricService } from './isms-metric.service';
import { IsmsMeasurementService } from './isms-measurement.service';
import { IsmsAuditService } from './isms-audit.service';
import { IsmsAuditControlService } from './isms-audit-control.service';
import { IsmsAuditFindingService } from './isms-audit-finding.service';
import { IsmsManagementReviewService } from './isms-management-review.service';
import { IsmsReviewInputService } from './isms-review-input.service';
import { IsmsReviewActionService } from './isms-review-action.service';
import { IsmsNarrativeService } from './isms-narrative.service';
import { IsmsProfileController } from './wizard/isms-profile.controller';
import { IsmsProfileService } from './wizard/isms-profile.service';
import { AuthModule } from '../auth/auth.module';
import { AttachmentsModule } from '../attachments/attachments.module';

@Module({
  // AttachmentsModule: S3 access for retaining per-version rendered exports.
  imports: [AuthModule, AttachmentsModule],
  controllers: [
    AuditLiveController,
    AuditWorkspaceController,
    IsmsController,
    IsmsRegistersController,
    IsmsProfileController,
  ],
  providers: [
    AuditWorkspaceFinish,
    AuditWorkspaceCompletion,
    AuditLiveAccess,
    AuditLiveBus,
    AuditLiveGateway,
    AuditWorkspaceService,
    AuditWorkspaceRequestsService,
    AuditWorkspaceEvidenceService,
    IsmsService,
    IsmsContextService,
    IsmsVersionService,
    IsmsContextIssueService,
    IsmsDocumentControlService,
    IsmsInterestedPartyService,
    IsmsRequirementService,
    IsmsObjectiveService,
    IsmsRoleService,
    IsmsRoleAssignmentService,
    IsmsMetricService,
    IsmsMeasurementService,
    IsmsAuditService,
    IsmsAuditControlService,
    IsmsAuditFindingService,
    IsmsManagementReviewService,
    IsmsReviewInputService,
    IsmsReviewActionService,
    IsmsNarrativeService,
    IsmsProfileService,
  ],
  exports: [
    IsmsService,
    IsmsContextService,
    IsmsVersionService,
    IsmsContextIssueService,
    IsmsDocumentControlService,
    IsmsInterestedPartyService,
    IsmsRequirementService,
    IsmsObjectiveService,
    IsmsRoleService,
    IsmsRoleAssignmentService,
    IsmsMetricService,
    IsmsMeasurementService,
    IsmsAuditService,
    IsmsAuditControlService,
    IsmsAuditFindingService,
    IsmsManagementReviewService,
    IsmsReviewInputService,
    IsmsReviewActionService,
    IsmsNarrativeService,
    IsmsProfileService,
  ],
})
export class IsmsModule {}
