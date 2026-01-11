// src/orders/dto/update-order-status.dto.ts

import { IsEnum, IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from 'src/generated/prisma/enums';


export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus, description: 'Nouveau statut' })
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @ApiPropertyOptional({ description: 'Note sur le changement de statut' })
  @IsString()
  @IsOptional()
  note?: string;

  @ApiPropertyOptional({ description: 'Notes générales de la commande' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Raison de l\'annulation' })
  @IsString()
  @IsOptional()
  cancelReason?: string;

  @ApiPropertyOptional({ description: 'ID de la personne qui modifie le statut' })
  @IsString()
  @IsOptional()
  createdBy?: string;
}
