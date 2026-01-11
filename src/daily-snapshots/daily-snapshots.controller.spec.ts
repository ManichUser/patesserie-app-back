import { Test, TestingModule } from '@nestjs/testing';
import { DailySnapshotsController } from './daily-snapshots.controller';

describe('DailySnapshotsController', () => {
  let controller: DailySnapshotsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DailySnapshotsController],
    }).compile();

    controller = module.get<DailySnapshotsController>(DailySnapshotsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
