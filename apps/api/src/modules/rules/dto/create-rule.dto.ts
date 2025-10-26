import { ArrayNotEmpty, IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateRuleDto {
  @IsString()
  tenantId!: string;

  @IsString()
  userId!: string;

  @IsString()
  sourceConnectionId!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  destinationConnectionIds!: string[];
}
