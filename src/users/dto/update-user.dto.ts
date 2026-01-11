// src/users/dto/update-user.dto.ts

import { IsString, IsOptional, IsBoolean, IsDateString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Gender } from 'src/generated/prisma/enums';

export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'Nom complet' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Numéro de téléphone' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: 'URL de l\'avatar' })
  @IsString()
  @IsOptional()
  avatar?: string;

  @ApiPropertyOptional({ description: 'Adresse complète' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: 'Ville' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ description: 'Quartier' })
  @IsString()
  @IsOptional()
  district?: string;

  @ApiPropertyOptional({ description: 'Date de naissance' })
  @IsDateString()
  @IsOptional()
  birthdate?: string;

  @ApiPropertyOptional({ enum: Gender, description: 'Genre' })
  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @ApiPropertyOptional({ description: 'Recevoir la newsletter' })
  @IsBoolean()
  @IsOptional()
  newsletter?: boolean;

  @ApiPropertyOptional({ description: 'Notifications SMS' })
  @IsBoolean()
  @IsOptional()
  smsNotifications?: boolean;
}


