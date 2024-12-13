/* eslint-disable @typescript-eslint/no-unused-vars */
import { HoldersService } from './holders.service';
import { Holder } from '../entities/holder.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { Order, SortBy } from '../dto/pagination.dto';

describe('HoldersService', () => {
  let service: HoldersService;
  let repository: any;

  const mockRepository = {
    findAndCount: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ total: '1000000000000000000' }),
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HoldersService,
        {
          provide: getRepositoryToken(Holder),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<HoldersService>(HoldersService);
    repository = module.get(getRepositoryToken(Holder));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getHolders', () => {
    it('should return paginated holders with percentages', async () => {
      const mockHolders = [
        { address: '0x1', balance: '500000000000000000' },
        { address: '0x2', balance: '300000000000000000' },
      ];

      mockRepository.findAndCount.mockResolvedValue([mockHolders, 2]);

      const result = await service.getHolders({
        page: 1,
        limit: 10,
        sortBy: SortBy.PERCENTAGE,
        order: Order.DESC,
      });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.data[0].percentage).toBe('50.0000000000');
      expect(result.data[1].percentage).toBe('30.0000000000');
    });
  });
});
