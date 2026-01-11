// src/orders/dto/update-payment-status.dto.ts

import { IsEnum, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus } from 'src/generated/prisma/enums';

export class UpdatePaymentStatusDto {
  @ApiProperty({ enum: PaymentStatus, description: 'Statut de paiement' })
  @IsEnum(PaymentStatus)
  paymentStatus: PaymentStatus;

  @ApiPropertyOptional({ description: 'Méthode de paiement' })
  @IsString()
  @IsOptional()
  paymentMethod?: string;
}

