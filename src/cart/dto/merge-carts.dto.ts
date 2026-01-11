
import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MergeCartsDto {
  @ApiProperty({ description: 'ID du panier temporaire à fusionner' })
  @IsString()
  tempCartId: string;
}