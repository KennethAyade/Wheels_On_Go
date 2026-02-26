import { IsString } from 'class-validator';

export class FaceEnrollDto {
  @IsString()
  imageBase64: string;
}
