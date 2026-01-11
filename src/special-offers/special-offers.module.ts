// src/special-offers/special-offers.module.ts

import { Module } from '@nestjs/common';
import { SpecialOffersService } from './special-offers.service';
import { SpecialOffersController } from './special-offers.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SpecialOffersController],
  providers: [SpecialOffersService],
  exports: [SpecialOffersService],
})
export class SpecialOffersModule {}