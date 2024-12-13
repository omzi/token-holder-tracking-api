import { SyncService } from './sync.service';
import { ConfigService } from '@nestjs/config';
import { Holder } from '../entities/holder.entity';
import { SyncController } from './sync.controller';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Test, TestingModule } from '@nestjs/testing';
import { BlockState } from '../entities/blockstate.entity';

describe('SyncController', () => {
  let controller: SyncController;
  let service: SyncService;

  const mockHoldersRepository = {
    find: jest.fn(),
    manager: {
      transaction: jest.fn(),
    },
  };

  const mockBlockStateRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SyncController],
      providers: [
        SyncService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn(() => 'mock-api-key') },
        },
        {
          provide: getRepositoryToken(Holder),
          useValue: mockHoldersRepository,
        },
        {
          provide: getRepositoryToken(BlockState),
          useValue: mockBlockStateRepository,
        },
        {
          provide: SchedulerRegistry,
          useValue: { addCronJob: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<SyncController>(SyncController);
    service = module.get<SyncService>(SyncService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('syncData', () => {
    it('should call sync method of SyncService', async () => {
      const syncSpy = jest.spyOn(service, 'sync').mockResolvedValue();

      await controller.syncData();

      expect(syncSpy).toHaveBeenCalled();
    });

    it('should propagate errors from sync service', async () => {
      const error = new Error('Sync failed');
      jest.spyOn(service, 'sync').mockRejectedValue(error);

      await expect(controller.syncData()).rejects.toThrow('Sync failed');
    });
  });
});
