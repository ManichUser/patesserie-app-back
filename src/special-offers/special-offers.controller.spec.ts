import { Test, TestingModule } from '@nestjs/testing';
import { SpecialOffersController } from './special-offers.controller';

describe('SpecialOffersController', () => {
  let controller: SpecialOffersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SpecialOffersController],
    }).compile();

    controller = module.get<SpecialOffersController>(SpecialOffersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
