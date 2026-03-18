import { IsBoolean, IsString, IsNotEmpty } from 'class-validator';

export class SubmitBlowbagetsDto {
  @IsString()
  @IsNotEmpty()
  rideId: string;

  @IsBoolean()
  brakes: boolean;

  @IsBoolean()
  lights: boolean;

  @IsBoolean()
  oil: boolean;

  @IsBoolean()
  water: boolean;

  @IsBoolean()
  battery: boolean;

  @IsBoolean()
  air: boolean;

  @IsBoolean()
  gas: boolean;

  @IsBoolean()
  engine: boolean;

  @IsBoolean()
  tools: boolean;

  @IsBoolean()
  self: boolean;
}
