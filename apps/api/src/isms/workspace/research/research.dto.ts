import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
export class AuditResearchThreadDto {
  @ApiProperty({
    description: 'Short topic for a persistent audit research conversation.',
    maxLength: 100,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title!: string;
}
export class AuditResearchPromptDto {
  @ApiProperty({
    description: 'Question to research against organization evidence.',
    maxLength: 6000,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(6000)
  prompt!: string;

  @ApiProperty({
    description:
      'Client-generated UUID. Reuse it when retrying an uncertain HTTP outcome.',
  })
  @IsUUID()
  requestId!: string;
}
