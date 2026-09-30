import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsUUID } from 'class-validator';

export class AuditViewConsentDto {
  @ApiProperty({
    description:
      'Whether live audit view sharing is enabled for this workspace visit.',
  })
  @IsBoolean()
  allowed!: boolean;
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
