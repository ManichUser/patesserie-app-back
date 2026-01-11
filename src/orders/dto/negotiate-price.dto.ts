

import { IsNumber, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class NegotiatePriceDto {
  @ApiProperty({ description: 'Nouveau prix total négocié' })
  @IsNumber()
  @Min(0)
  negotiatedTotal: number;

  @ApiProperty({ description: 'Raison de la négociation' })
  @IsString()
  reason: string;
}
