// src/orders/dto/cancel-order.dto.ts

import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CancelOrderDto {
  @ApiPropertyOptional({ description: 'Raison de l\'annulation' })
  @IsString()
  @IsOptional()
  reason?: string;
}
