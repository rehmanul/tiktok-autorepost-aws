import { IsBooleanString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ListRulesDto {
  @IsString()
  @IsNotEmpty()
  tenantId!: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsBooleanString()
  includeInactive?: string;
}
