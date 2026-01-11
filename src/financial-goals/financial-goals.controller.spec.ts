import { Test, TestingModule } from '@nestjs/testing';
import { FinancialGoalsController } from './financial-goals.controller';

describe('FinancialGoalsController', () => {
  let controller: FinancialGoalsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FinancialGoalsController],
    }).compile();

    controller = module.get<FinancialGoalsController>(FinancialGoalsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
