import { IsString, IsNotEmpty } from 'class-validator';

export class PresignBreathalyzerDto {
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @IsString()
  @IsNotEmpty()
  mimeType: string;
}
