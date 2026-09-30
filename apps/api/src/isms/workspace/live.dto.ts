import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsUUID } from 'class-validator';

export class AuditViewConsentDto {
  @ApiProperty({
    description:
      'The signed-in person’s explicit choice for this audit workspace visit.',
  })
  @IsBoolean()
  allowed!: boolean;
}
export class AuditLiveTicketDto {
  @ApiProperty({
    enum: ['publish', 'observe'],
    description:
      'Publish a consented audit view or observe as an authorized administrator.',
  })
  @IsIn(['publish', 'observe'])
  mode!: 'publish' | 'observe';

  @ApiPropertyOptional({
    description:
      'Consent nonce returned by the person’s own consent decision. Required to publish.',
  })
  @IsOptional()
  @IsUUID()
  nonce?: string;
}
