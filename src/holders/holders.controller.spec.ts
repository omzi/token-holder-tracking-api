/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { HoldersController } from './holders.controller';
import { HoldersService } from './holders.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Holder } from '../entities/holder.entity';
import { Order } from '../dto/pagination.dto';
import { SortBy } from '../dto/pagination.dto';

describe('HoldersController', () => {
  let controller: HoldersController;
  let service: HoldersService;

  const mockHoldersRepository = {
    findAndCount: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ total: '1000000000000000000' }),
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HoldersController],
      providers: [
        HoldersService,
        {
          provide: getRepositoryToken(Holder),
          useValue: mockHoldersRepository,
        },
      ],
    }).compile();

    controller = module.get<HoldersController>(HoldersController);
    service = module.get<HoldersService>(HoldersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getHolders', () => {
    it('should return paginated holders', async () => {
      const mockHolders = [
        { address: '0x1', balance: '100' },
        { address: '0x2', balance: '200' },
      ];

      mockHoldersRepository.findAndCount.mockResolvedValue([mockHolders, 2]);

      const result = await controller.getHolders({
        page: 1,
        limit: 10,
        sortBy: SortBy.BALANCE,
        order: Order.DESC,
      });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
    });
  });
});
