// src/orders/dto/create-order.dto.ts

import { IsString, IsNumber, IsOptional, IsDateString, IsArray, ValidateNested, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class OrderItemDto {
  @ApiProperty({ description: 'ID du produit' })
  @IsString()
  productId: string;

  @ApiProperty({ description: 'Quantité', minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ description: 'Note pour cet article' })
  @IsString()
  @IsOptional()
  note?: string;
}

export class CreateOrderDto {
  // Adresse de livraison (utiliser une adresse sauvegardée OU remplir manuellement)
  @ApiPropertyOptional({ description: 'ID de l\'adresse de livraison sauvegardée' })
  @IsString()
  @IsOptional()
  addressId?: string;

  @ApiPropertyOptional({ description: 'Nom du destinataire' })
  @IsString()
  @IsOptional()
  deliveryName?: string;

  @ApiPropertyOptional({ description: 'Téléphone du destinataire' })
  @IsString()
  @IsOptional()
  deliveryPhone?: string;

  @ApiPropertyOptional({ description: 'Adresse de livraison' })
  @IsString()
  @IsOptional()
  deliveryAddress?: string;

  @ApiPropertyOptional({ description: 'Ville' })
  @IsString()
  @IsOptional()
  deliveryCity?: string;

  @ApiPropertyOptional({ description: 'Quartier' })
  @IsString()
  @IsOptional()
  deliveryDistrict?: string;

  @ApiPropertyOptional({ description: 'Point de repère' })
  @IsString()
  @IsOptional()
  deliveryLandmark?: string;

  @ApiPropertyOptional({ description: 'Instructions de livraison' })
  @IsString()
  @IsOptional()
  deliveryInstructions?: string;

  // Date et paiement
  @ApiPropertyOptional({ description: 'Date de livraison souhaitée' })
  @IsDateString()
  @IsOptional()
  scheduledAt?: string;

  @ApiPropertyOptional({ description: 'Méthode de paiement' })
  @IsString()
  @IsOptional()
  paymentMethod?: string;

  // Montants (calculés automatiquement si non fournis)
  @ApiPropertyOptional({ description: 'Frais de livraison', default: 0 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  deliveryFee?: number;

  @ApiPropertyOptional({ description: 'Réduction', default: 0 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  discount?: number;

  @ApiPropertyOptional({ description: 'Taxes', default: 0 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  tax?: number;

  // Items
  @ApiProperty({ description: 'Articles de la commande', type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  // Panier et notes
  @ApiPropertyOptional({ description: 'ID du panier (si commande depuis un panier)' })
  @IsString()
  @IsOptional()
  cartId?: string;

  @ApiPropertyOptional({ description: 'Notes pour la commande' })
  @IsString()
  @IsOptional()
  notes?: string;
}