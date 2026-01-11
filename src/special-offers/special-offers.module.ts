import { Module } from '@nestjs/common';
import { SpecialOffersController } from './special-offers.controller';
import { SpecialOffersService } from './special-offers.service';

@Module({
  controllers: [SpecialOffersController],
  providers: [SpecialOffersService]
})
export class SpecialOffersModule {}
