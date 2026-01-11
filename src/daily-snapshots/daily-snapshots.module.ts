// src/daily-snapshots/daily-snapshots.module.ts

import { Module } from '@nestjs/common';
import { DailySnapshotsService } from './daily-snapshots.service';
import { DailySnapshotsController } from './daily-snapshots.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DailySnapshotsController],
  providers: [DailySnapshotsService],
  exports: [DailySnapshotsService],
})
export class DailySnapshotsModule {}