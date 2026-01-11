// src/daily-snapshots/daily-snapshots.controller.ts

import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DailySnapshotsService } from './daily-snapshots.service';

@ApiTags('Daily Snapshots')
@Controller('daily-snapshots')
export class DailySnapshotsController {
  constructor(private readonly service: DailySnapshotsService) {}

  @Get()
  @ApiOperation({ summary: 'Récupérer les snapshots' })
  getSnapshots(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: number,
  ) {
    return this.service.getSnapshots(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      limit || 30,
    );
  }

  @Get('generate')
  @ApiOperation({ summary: 'Générer le snapshot du jour précédent' })
  generate() {
    return this.service.generateDailySnapshot();
  }

  @Get('trend/:metric')
  @ApiOperation({ summary: 'Tendance d\'une métrique' })
  getTrend(@Param('metric') metric: string, @Query('days') days?: number) {
    return this.service.getTrend(metric, days || 30);
  }

  @Get(':date')
  @ApiOperation({ summary: 'Récupérer un snapshot par date' })
  getSnapshot(@Param('date') date: string) {
    return this.service.getSnapshot(new Date(date));
  }

  @Get(':date/compare')
  @ApiOperation({ summary: 'Comparer avec une période précédente' })
  getComparison(
    @Param('date') date: string,
    @Query('with') compareWith: 'yesterday' | 'lastWeek' | 'lastMonth' = 'yesterday',
  ) {
    return this.service.getComparison(new Date(date), compareWith);
  }
}

