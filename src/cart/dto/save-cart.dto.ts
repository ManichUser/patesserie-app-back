// src/carts/dto/save-cart.dto.ts

import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SaveCartDto {
  @ApiProperty({ description: 'Nom du panier' })
  @IsString()
  name: string;
}
