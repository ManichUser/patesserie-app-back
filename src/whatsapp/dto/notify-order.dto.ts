import { IsString } from 'class-validator';

export class NotifyOrderDto {
  @IsString()
  orderId: string;
}