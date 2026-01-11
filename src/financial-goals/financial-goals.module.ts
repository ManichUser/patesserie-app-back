// src/financial-goals/financial-goals.module.ts

import { Module } from '@nestjs/common';
import { FinancialGoalsService } from './financial-goals.service';
import { FinancialGoalsController } from './financial-goals.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FinancialGoalsController],
  providers: [FinancialGoalsService],
  exports: [FinancialGoalsService],
})
export class FinancialGoalsModule {}
