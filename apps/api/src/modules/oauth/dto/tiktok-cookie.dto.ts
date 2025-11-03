import { IsNotEmpty, IsString } from 'class-validator';

export class TikTokCookieConnectionDto {
  @IsString()
  @IsNotEmpty()
  tenantId!: string;

  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  accountHandle!: string;

  @IsString()
  @IsNotEmpty()
  cookies!: string;
}
