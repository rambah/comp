import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class AuditReviewDto {
  @ApiProperty({
    description:
      'Last observed check update timestamp, for conflict detection.',
  })
  @IsDateString()
  expectedUpdatedAt: string;

  @ApiProperty({
    description:
      'Sampling details, evidence examined and reviewer observations.',
  })
  @IsString()
  @MaxLength(20000)
  notes: string;

  @ApiPropertyOptional({
    enum: [
      'conformity_confirmed',
      'nonconformity_raised',
      'observation_raised',
      'not_sampled',
    ],
    description: 'Omit to save a draft. Supply to complete the review.',
  })
  @IsOptional()
  @IsIn([
    'conformity_confirmed',
    'nonconformity_raised',
    'observation_raised',
    'not_sampled',
  ])
  result?:
    | 'conformity_confirmed'
    | 'nonconformity_raised'
    | 'observation_raised'
    | 'not_sampled';
}

export class AuditRequestDto {
  @ApiProperty({
    description: 'Exact record, period or clarification requested.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  question: string;

  @ApiProperty({
    description:
      'Active organization member responsible for coordinating the response.',
  })
  @IsString()
  @MinLength(1)
  ownerMemberId: string;

  @ApiProperty({ description: 'Due date in ISO format.' })
  @IsDateString()
  dueDate: string;
}

export class AuditResponseDto {
  @ApiProperty({ description: 'Last observed request update timestamp.' })
  @IsDateString()
  expectedUpdatedAt: string;

  @ApiProperty({
    description: 'Response, clarification or reason for the review decision.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  content: string;

  @ApiProperty({ enum: ['open', 'submitted', 'changes_requested', 'accepted'] })
  @IsIn(['open', 'submitted', 'changes_requested', 'accepted'])
  status: 'open' | 'submitted' | 'changes_requested' | 'accepted';
}

export class AuditSourceDto {
  @ApiProperty({ enum: ['attachment', 'policy', 'document'] })
  @IsIn(['attachment', 'policy', 'document'])
  sourceType: 'attachment' | 'policy' | 'document';

  @ApiProperty({
    description:
      'Existing organization-scoped attachment, policy or ISMS document ID.',
  })
  @IsString()
  @MinLength(1)
  sourceId: string;
}

export class WorkspaceFindingDto {
  @ApiProperty({ enum: ['nc_major', 'nc_minor', 'ofi', 'observation'] })
  @IsIn(['nc_major', 'nc_minor', 'ofi', 'observation'])
  type: 'nc_major' | 'nc_minor' | 'ofi' | 'observation';

  @ApiProperty({
    description: 'Observed condition, supporting evidence and audit criterion.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(20000)
  description: string;

  @ApiPropertyOptional({
    description: 'Organization member responsible for follow-up.',
  })
  @IsOptional()
  @IsString()
  ownerMemberId?: string;

  @ApiPropertyOptional({ description: 'Follow-up due date.' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
