import { Test, TestingModule } from '@nestjs/testing';
import { FinancialGoalsService } from './financial-goals.service';

describe('FinancialGoalsService', () => {
  let service: FinancialGoalsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FinancialGoalsService],
    }).compile();

    service = module.get<FinancialGoalsService>(FinancialGoalsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
