import { ethers } from 'ethers';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Holder } from '../entities/holder.entity';
import { Injectable, Logger } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { BlockState } from '../entities/blockstate.entity';

// Minimal ERC20 ABI
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
];

/**
 * Service responsible for synchronizing token holder data from the blockchain
 * Handles periodic updates and maintains holder balances
 */
@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);
  private readonly TOKEN_ADDRESS = '0xdcc0f2d8f90fde85b10ac1c8ab57dc0ae946a543';
  private readonly ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
  private isSyncing = false;
  private provider: ethers.JsonRpcProvider;
  private tokenContract: ethers.Contract;

  constructor(
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly configService: ConfigService,
    @InjectRepository(Holder)
    private readonly holdersRepository: Repository<Holder>,
    @InjectRepository(BlockState)
    private readonly blockStateRepository: Repository<BlockState>,
  ) {
    // Initialize ethers provider and contract
    this.provider = new ethers.JsonRpcProvider(
      this.configService.get('FRAXSCAN_RPC_URL'),
    );
    this.tokenContract = new ethers.Contract(
      this.TOKEN_ADDRESS,
      ERC20_ABI,
      this.provider,
    );
  }

  private async processAddresses(
    uniqueAddresses: string[],
  ): Promise<Map<string, string>> {
    const balances = new Map<string, string>();
    const BATCH_SIZE = 10000;
    const CONCURRENT_BATCHES = 10;

    // Split addresses into batches
    const batches: string[][] = [];
    for (let i = 0; i < uniqueAddresses.length; i += BATCH_SIZE) {
      batches.push(uniqueAddresses.slice(i, i + BATCH_SIZE));
    }

    // Process batches concurrently
    for (let i = 0; i < batches.length; i += CONCURRENT_BATCHES) {
      const currentBatches = batches.slice(i, i + CONCURRENT_BATCHES);
      const promises = currentBatches.map(async (addressBatch) => {
        const balancePromises = addressBatch.map(async (address) => {
          try {
            const balance = await this.tokenContract.balanceOf(address);
            if (balance > 0) {
              balances.set(address.toLowerCase(), balance.toString());
            }
          } catch (error) {
            this.logger.error(
              `Error fetching balance for address ${address}: ${error}`,
            );
            throw error;
          }
        });

        await Promise.all(balancePromises);
      });

      await Promise.all(promises);
      // Small delay to avoid overwhelming the RPC
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return balances;
  }

  /**
   * Initiates a manual sync of token holder data from the blockchain
   * Processes transactions in chunks to stay within API rate limits
   * @throws Error if sync fails
   */
  async sync(): Promise<void> {
    try {
      // Get the last processed block
      const blockState = await this.blockStateRepository.findOne({
        where: { id: 'latest' },
      });
      const startBlock = blockState
        ? parseInt(blockState.lastProcessedBlock) + 1
        : 0;

      // Get all Transfer events
      const filter = this.tokenContract.filters.Transfer();
      const currentBlock = await this.provider.getBlockNumber();
      const CHUNK_SIZE = 100000;
      let fromBlock = startBlock;
      const uniqueAddresses = new Set<string>();

      while (fromBlock < currentBlock) {
        const toBlock = Math.min(fromBlock + CHUNK_SIZE, currentBlock);

        try {
          const events = await this.tokenContract.queryFilter(
            filter,
            fromBlock,
            toBlock,
          );

          events.forEach((event) => {
            const decoded = this.tokenContract.interface.parseLog(event);
            const to = decoded.args.to.toLowerCase();
            if (to !== this.ZERO_ADDRESS) {
              uniqueAddresses.add(to);
            }
          });

          fromBlock = toBlock + 1;
          this.logger.log(
            `Processed blocks ${fromBlock} to ${toBlock}, found ${uniqueAddresses.size} unique addresses`,
          );
        } catch (error) {
          this.logger.error(
            `Error fetching events from blocks ${fromBlock} to ${toBlock}:`,
            error,
          );
          throw error;
        }
      }

      // Process addresses in batches to get balances
      const balances = await this.processAddresses([...uniqueAddresses]);

      // Convert balances to holders
      const holders = Array.from(balances.entries()).map(
        ([address, balance]) => ({
          address,
          balance,
        }),
      );

      // Update database
      await this.holdersRepository.manager.transaction(async (manager) => {
        await manager.save(Holder, holders);
        await manager.save(BlockState, {
          id: 'latest',
          lastProcessedBlock: currentBlock.toString(),
        });
      });

      this.logger.log(
        `✅ Synchronization completed. Found ${holders.length} current holders`,
      );
    } catch (error) {
      this.logger.error('Error during sync :>>', error);
      throw error;
    }
  }

  async checkSyncStatus(): Promise<boolean> {
    return this.isSyncing;
  }

  @Cron('*/10 * * * * *')
  async handleSyncCron() {
    if (this.isSyncing) {
      this.logger.log('⏳ Sync already in progress, skipping...');
      return;
    }

    this.logger.log('🔄 Starting scheduled synchronization...');

    try {
      this.isSyncing = true;
      await this.sync();
    } catch (error) {
      this.logger.error(`❌ Error in sync cron job: ${error}`);
    } finally {
      this.isSyncing = false;
    }
  }
}
