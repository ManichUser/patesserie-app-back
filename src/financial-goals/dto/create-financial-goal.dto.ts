// src/financial-goals/dto/create-financial-goal.dto.ts

import { IsEnum, IsNumber, IsDateString, IsBoolean, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GoalType, GoalPeriod } from 'src/generated/prisma/client';

export class CreateFinancialGoalDto {
  @ApiProperty({ enum: GoalType })
  @IsEnum(GoalType)
  type: GoalType;

  @ApiProperty({ enum: GoalPeriod })
  @IsEnum(GoalPeriod)
  period: GoalPeriod;

  @ApiProperty({ description: 'Valeur cible' })
  @IsNumber()
  @Min(0)
  targetValue: number;

  @ApiProperty({ description: 'Date de début' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'Date de fin' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ description: 'Est actif', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
