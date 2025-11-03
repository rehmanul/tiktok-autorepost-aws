import { IsNotEmpty, IsString } from 'class-validator';

export class OAuthCallbackDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  state!: string;

  @IsString()
  @IsNotEmpty()
  error?: string;

  @IsString()
  @IsNotEmpty()
  error_description?: string;
}
