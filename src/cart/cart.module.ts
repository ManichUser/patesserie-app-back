import { Module } from '@nestjs/common';
import { CartsService } from './cart.service';
import { CartsController } from './cart.controller';

@Module({
  controllers: [CartsController],
  providers: [CartsService],
  exports: [CartsService],
})
export class CartModule {}