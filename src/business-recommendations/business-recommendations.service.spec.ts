import { Test, TestingModule } from '@nestjs/testing';
import { BusinessRecommendationsService } from './business-recommendations.service';

describe('BusinessRecommendationsService', () => {
  let service: BusinessRecommendationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BusinessRecommendationsService],
    }).compile();

    service = module.get<BusinessRecommendationsService>(BusinessRecommendationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
