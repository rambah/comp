import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAttachmentFeedbackDto {
  @ApiProperty({ description: 'Existing attachment to flag.' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  attachmentId!: string;

  @ApiProperty({
    description: 'Explain what is insufficient or needs correction.',
    maxLength: 5000,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  comment!: string;
}

export class RespondAttachmentFeedbackDto {
  @ApiProperty({
    description: 'Describe the correction, response or reason for reopening.',
    maxLength: 5000,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  comment!: string;

  @ApiProperty({
    enum: ['open', 'resolved'],
    description:
      'Feedback status after this response; does not approve evidence.',
  })
  @IsIn(['open', 'resolved'])
  status!: 'open' | 'resolved';

  @ApiProperty({
    description: 'updatedAt from the latest feedback, for conflict detection.',
  })
  @IsDateString()
  expectedUpdatedAt!: string;
}

export class ListAttachmentFeedbackDto {
  @ApiPropertyOptional({ description: 'Filter feedback for this attachment.' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  attachmentId?: string;

  @ApiPropertyOptional({
    enum: ['open', 'resolved'],
    description: 'Omit to include all statuses.',
  })
  @IsOptional()
  @IsIn(['open', 'resolved'])
  status?: 'open' | 'resolved';

  @ApiPropertyOptional({
    type: Number,
    default: 0,
    description: 'Pagination offset; 50 feedback items per page.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset = 0;
}
