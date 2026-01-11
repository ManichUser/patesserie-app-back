// src/business-recommendations/business-recommendations.module.ts

import { Module } from '@nestjs/common';
import { BusinessRecommendationsService } from './business-recommendations.service';
import { BusinessRecommendationsController } from './business-recommendations.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BusinessRecommendationsController],
  providers: [BusinessRecommendationsService],
  exports: [BusinessRecommendationsService],
})
export class BusinessRecommendationsModule {}
