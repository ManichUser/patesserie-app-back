import { IsString, IsOptional, IsBoolean, IsInt, Min, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Desserts', description: 'Nom de la catégorie' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'Nos délicieux desserts faits maison', description: 'Description de la catégorie' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: 'desserts', description: 'Slug URL-friendly (auto-généré si non fourni)' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  slug?: string;

  @ApiPropertyOptional({ example: '🍰', description: 'Icône ou emoji' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  icon?: string;

  @ApiPropertyOptional({ example: 'https://example.com/image.jpg', description: 'URL de l\'image' })
  @IsString()
  @IsOptional()
  image?: string;

  @ApiPropertyOptional({ example: 1, description: 'Ordre d\'affichage', default: 0 })
  @IsInt()
  @IsOptional()
  @Min(0)
  order?: number;

  @ApiPropertyOptional({ example: true, description: 'Catégorie active', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}