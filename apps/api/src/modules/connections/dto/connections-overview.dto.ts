import { IsOptional, IsString } from 'class-validator';

export class ConnectionsOverviewDto {
  @IsOptional()
  @IsString()
  tenantId?: string;
}
