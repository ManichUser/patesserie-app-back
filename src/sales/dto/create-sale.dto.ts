// src/sales/dto/create-sale.dto.ts

import { IsString, IsNumber, IsBoolean, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSaleDto {
  @ApiProperty({ description: 'ID de la commande' })
  @IsString()
  orderId: string;

  @ApiProperty({ description: 'Prix catalogue total' })
  @IsNumber()
  @Min(0)
  listPrice: number;

  @ApiProperty({ description: 'Prix affiché au client' })
  @IsNumber()
  @Min(0)
  salePrice: number;

  @ApiProperty({ description: 'Prix réellement payé' })
  @IsNumber()
  @Min(0)
  actualPrice: number;

  @ApiProperty({ description: 'Coût de revient total' })
  @IsNumber()
  @Min(0)
  costPrice: number;

  @ApiPropertyOptional({ description: 'Coût de livraison' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  deliveryCost?: number;

  @ApiPropertyOptional({ description: 'Autres coûts' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  otherCosts?: number;

  @ApiProperty({ description: 'Méthode de paiement' })
  @IsString()
  paymentMethod: string;

  @ApiPropertyOptional({ description: 'A été négocié' })
  @IsOptional()
  @IsBoolean()
  wasNegotiated?: boolean;

  @ApiPropertyOptional({ description: 'Montant de la négociation' })
  @IsOptional()
  @IsNumber()
  negotiationAmount?: number;

  @ApiPropertyOptional({ description: 'Raison de la négociation' })
  @IsOptional()
  @IsString()
  negotiationReason?: string;
}