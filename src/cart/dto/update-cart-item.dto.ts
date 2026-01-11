// src/carts/dto/update-cart-item.dto.ts

import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCartItemDto {
  @ApiProperty({ description: 'Nouvelle quantité', minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ description: 'Note pour cet article' })
  @IsString()
  @IsOptional()
  note?: string;
}

