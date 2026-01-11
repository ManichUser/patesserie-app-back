import { Test, TestingModule } from '@nestjs/testing';
import { BusinessRecommendationsController } from './business-recommendations.controller';

describe('BusinessRecommendationsController', () => {
  let controller: BusinessRecommendationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BusinessRecommendationsController],
    }).compile();

    controller = module.get<BusinessRecommendationsController>(BusinessRecommendationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
