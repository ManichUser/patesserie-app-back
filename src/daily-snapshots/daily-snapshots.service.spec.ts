import { Test, TestingModule } from '@nestjs/testing';
import { DailySnapshotsService } from './daily-snapshots.service';

describe('DailySnapshotsService', () => {
  let service: DailySnapshotsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DailySnapshotsService],
    }).compile();

    service = module.get<DailySnapshotsService>(DailySnapshotsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
