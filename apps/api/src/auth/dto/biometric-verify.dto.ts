import { IsNotEmpty } from 'class-validator';

export class BiometricVerifyDto {
  @IsNotEmpty()
  liveImageBase64: string;
}
