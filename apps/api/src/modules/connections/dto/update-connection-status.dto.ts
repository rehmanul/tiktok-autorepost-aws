import { ConnectionStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateConnectionStatusDto {
  @IsEnum(ConnectionStatus)
  status!: ConnectionStatus;

  @IsOptional()
  @IsString()
  errorMessage?: string;
}
