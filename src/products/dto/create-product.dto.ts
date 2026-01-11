// src/products/dto/create-product.dto.ts

import { IsString, IsNumber, IsOptional, IsBoolean, IsArray, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ description: 'Nom du produit' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Description du produit' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Prix du produit' })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ description: 'Prix barré' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  compareAtPrice?: number;

  @ApiPropertyOptional({ description: 'Prix de revient' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @ApiPropertyOptional({ description: 'ID de la catégorie' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'SKU' })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({ description: 'Poids en kg' })
  @IsOptional()
  @IsNumber()
  weight?: number;

  @ApiPropertyOptional({ description: 'Nombre de portions' })
  @IsOptional()
  @IsNumber()
  servings?: number;

  @ApiPropertyOptional({ description: 'Stock' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({ description: 'Seuil de stock bas' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  lowStockThreshold?: number;

  @ApiPropertyOptional({ description: 'Disponible' })
  @IsOptional()
  @IsBoolean()
  available?: boolean;

  @ApiPropertyOptional({ description: 'Ingrédients' })
  @IsOptional()
  @IsString()
  ingredients?: string;

  @ApiPropertyOptional({ description: 'Allergènes' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergens?: string[];

  @ApiPropertyOptional({ description: 'Calories' })
  @IsOptional()
  @IsNumber()
  calories?: number;

  @ApiPropertyOptional({ description: 'Protéines (g)' })
  @IsOptional()
  @IsNumber()
  protein?: number;

  @ApiPropertyOptional({ description: 'Glucides (g)' })
  @IsOptional()
  @IsNumber()
  carbs?: number;

  @ApiPropertyOptional({ description: 'Lipides (g)' })
  @IsOptional()
  @IsNumber()
  fat?: number;

  @ApiPropertyOptional({ description: 'Temps de préparation (minutes)' })
  @IsOptional()
  @IsNumber()
  prepTime?: number;

  @ApiPropertyOptional({ description: 'Meta titre (SEO)' })
  @IsOptional()
  @IsString()
  metaTitle?: string;

  @ApiPropertyOptional({ description: 'Meta description (SEO)' })
  @IsOptional()
  @IsString()
  metaDescription?: string;
}