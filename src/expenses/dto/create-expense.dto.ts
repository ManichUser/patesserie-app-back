// src/expenses/dto/create-expense.dto.ts

import { IsString, IsNumber, IsOptional, IsBoolean, IsEnum, IsDateString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExpenseCategory, ExpenseFrequency } from 'src/generated/prisma/client';

export class CreateExpenseDto {
  @ApiProperty({ enum: ExpenseCategory, description: 'Catégorie de dépense' })
  @IsEnum(ExpenseCategory)
  category: ExpenseCategory;

  @ApiProperty({ description: 'Description de la dépense' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Montant de la dépense' })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ description: 'Fournisseur' })
  @IsOptional()
  @IsString()
  vendor?: string;

  @ApiPropertyOptional({ description: 'Référence (facture, reçu)' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({ description: 'Notes supplémentaires' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Est récurrente' })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiPropertyOptional({ enum: ExpenseFrequency, description: 'Fréquence' })
  @IsOptional()
  @IsEnum(ExpenseFrequency)
  frequency?: ExpenseFrequency;

  @ApiPropertyOptional({ description: 'URL du reçu' })
  @IsOptional()
  @IsString()
  receiptUrl?: string;

  @ApiPropertyOptional({ description: 'Date de la dépense' })
  @IsOptional()
  @IsDateString()
  expenseDate?: string;
}



