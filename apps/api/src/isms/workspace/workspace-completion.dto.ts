import { ApiProperty } from '@nestjs/swagger';
import {
  Equals,
  IsDateString,
  IsIn,
  IsString,
  MaxLength,
} from 'class-validator';
export class AuditFindingFollowupDto {
  @ApiProperty({ description: 'Last observed finding update timestamp.' })
  @IsDateString()
  expectedUpdatedAt!: string;
  @ApiProperty({ enum: ['open', 'in_progress', 'closed'] })
  @IsIn(['open', 'in_progress', 'closed'])
  status!: 'open' | 'in_progress' | 'closed';
  @ApiProperty({
    description:
      'Follow-up actions and evidence of resolution. Required to close.',
  })
  @IsString()
  @MaxLength(20000)
  closureEvidence!: string;
}
export class AuditConclusionDto {
  @ApiProperty({ description: 'Last observed audit update timestamp.' })
  @IsDateString()
  expectedUpdatedAt!: string;
  @ApiProperty({
    enum: ['conform', 'substantially_conform', 'not_yet_conform'],
  })
  @IsIn(['conform', 'substantially_conform', 'not_yet_conform'])
  conclusionVerdict!: 'conform' | 'substantially_conform' | 'not_yet_conform';
  @ApiProperty({
    description:
      'Overall audit conclusion and limitations; saving does not sign or approve the report.',
  })
  @IsString()
  @MaxLength(20000)
  conclusionNotes!: string;
}

export class AuditFinishDto {
  @ApiProperty({ description: 'Last observed audit update timestamp.' })
  @IsDateString()
  expectedUpdatedAt!: string;
  @ApiProperty({
    description:
      'Explicit confirmation that you completed the audit and recorded its conclusion.',
    enum: [true],
  })
  @Equals(true)
  confirmed!: boolean;
}
