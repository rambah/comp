import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Equals,
  IsBoolean,
  IsIn,
  IsOptional,
  IsUUID,
  ValidateIf,
} from 'class-validator';

export class AuditViewConsentDto {
  @ApiProperty({
    description:
      'Whether live audit view sharing is enabled for this workspace visit.',
  })
  @IsBoolean()
  allowed!: boolean;

  @ApiPropertyOptional({
    enum: [2],
    description:
      'Required when enabling sharing: confirms the current notice covering live dialogs and unsaved inputs.',
  })
  @ValidateIf((value: AuditViewConsentDto) => value.allowed === true)
  @Equals(2)
  noticeVersion?: number;
}
export class AuditLiveTicketDto {
  @ApiProperty({
    enum: ['publish', 'observe'],
    description:
      'Publish an initialized audit view or observe as an authorized administrator.',
  })
  @IsIn(['publish', 'observe'])
  mode!: 'publish' | 'observe';

  @ApiPropertyOptional({
    description:
      'Session nonce returned by workspace initialization. Required to publish.',
  })
  @IsOptional()
  @IsUUID()
  nonce?: string;
}
