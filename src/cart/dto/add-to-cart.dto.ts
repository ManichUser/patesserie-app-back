// src/carts/dto/add-to-cart.dto.ts

import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddToCartDto {
  @ApiProperty({ description: 'ID du produit' })
  @IsString()
  productId: string;

  @ApiProperty({ description: 'Quantité', minimum: 1, default: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ description: 'Note pour cet article' })
  @IsString()
  @IsOptional()
  note?: string;
}