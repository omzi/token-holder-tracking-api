import axios from 'axios';
import BigNumber from 'bignumber.js';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Holder } from '../entities/holder.entity';
import { Injectable, Logger } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { BlockState } from '../entities/blockstate.entity';

/**
 * Represents a token transfer transaction from the blockchain
 */
interface TokenTransaction {
  /** Block number where the transaction occurred */
  blockNumber: string;
  /** Timestamp of the transaction */
  timeStamp: string;
  /** Transaction hash */
  hash: string;
  /** Sender address */
  from: string;
  /** Recipient address */
  to: string;
  /** Amount transferred (in wei) */
  value: string;
}

/**
 * Represents the balance of an address
 */
interface AddressBalance {
  /** Address of the account */
  account: string;
  /** Balance of the account */
  balance: string;
}

/**
 * API response structure from Fraxscan
 */
interface Response<T> {
  /** Response status ('1' for success, '0' for failure) */
  status: string;
  /** Response message */
  message: string;
  /** Array of results */
  result: T[];
}

/**
 * Service responsible for synchronizing token holder data from the blockchain
 * Handles periodic updates and maintains holder balances
 */
@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);
  private readonly FRAXSCAN_API_URL = 'https://api.fraxscan.com/api';
  private readonly TOKEN_ADDRESS = '0xdcc0f2d8f90fde85b10ac1c8ab57dc0ae946a543';
  private readonly ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
  private isSyncing = false;

  constructor(
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly configService: ConfigService,
    @InjectRepository(Holder)
    private readonly holdersRepository: Repository<Holder>,
    @InjectRepository(BlockState)
    private readonly blockStateRepository: Repository<BlockState>,
  ) {}

  private async fetchTransactionPage(
    startBlock: number,
    endBlock: number,
  ): Promise<TokenTransaction[]> {
    try {
      this.logger.log(
        `Fetching transactions from block ${startBlock} to ${endBlock}`,
      );

      const response = await axios.get<Response<TokenTransaction>>(
        this.FRAXSCAN_API_URL,
        {
          params: {
            module: 'account',
            action: 'tokentx',
            contractaddress: this.TOKEN_ADDRESS,
            startblock: startBlock,
            endblock: endBlock,
            sort: 'asc',
            apikey: this.configService.get('FRAXSCAN_API_KEY'),
          },
        },
      );

      if (!response.data.result || !Array.isArray(response.data.result)) {
        this.logger.error('Invalid response format:', response.data);
        return [];
      }

      return response.data.result;
    } catch (error) {
      this.logger.error(
        `Error fetching transactions from block ${startBlock} to ${endBlock}:`,
        error,
      );
      throw error;
    }
  }

  private async processAddresses(
    uniqueAddresses: string[],
  ): Promise<Map<string, string>> {
    const balances = new Map<string, string>();
    const BATCH_SIZE = 20;
    const CONCURRENT_BATCHES = 5;

    // Split all addresses into batches of 20
    const batches: string[][] = [];
    for (let i = 0; i < uniqueAddresses.length; i += BATCH_SIZE) {
      batches.push(uniqueAddresses.slice(i, i + BATCH_SIZE));
    }

    // Process batches in groups of 5 concurrent requests
    for (let i = 0; i < batches.length; i += CONCURRENT_BATCHES) {
      const currentBatches = batches.slice(i, i + CONCURRENT_BATCHES);
      const promises = currentBatches.map(async (addressBatch) => {
        const addressString = addressBatch.join(',');

        try {
          const response = await axios.get<Response<AddressBalance>>(
            this.FRAXSCAN_API_URL,
            {
              params: {
                module: 'account',
                action: 'balancemulti',
                address: addressString,
                tag: 'latest',
                apikey: this.configService.get('FRAXSCAN_API_KEY'),
              },
            },
          );

          if (response.data.result) {
            response.data.result.forEach(({ account, balance }) => {
              if (new BigNumber(balance).isGreaterThan(0)) {
                balances.set(account.toLowerCase(), balance);
              }
            });
          }
        } catch (error) {
          this.logger.error(`Error fetching balances for batch: ${error}`);
          throw error;
        }
      });

      await Promise.all(promises);
      // Wait 1 second before processing next batch of 5
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return balances;
  }

  private async processTransactions(
    transactions: TokenTransaction[],
  ): Promise<void> {
    if (transactions.length === 0) return;

    // Extract unique "to" addresses, excluding zero address
    const uniqueAddresses = [
      ...new Set(
        transactions
          .map((tx) => tx.to)
          .filter((address) => address !== this.ZERO_ADDRESS),
      ),
    ];

    // Get all balances with concurrent processing
    const balances = await this.processAddresses(uniqueAddresses);

    // Convert balances to holders array
    const holders = Array.from(balances.entries()).map(
      ([address, balance]) => ({
        address,
        balance,
      }),
    );

    // Update database in a transaction
    await this.holdersRepository.manager.transaction(async (manager) => {
      await manager.save(Holder, holders);

      // Update the last processed block
      const lastBlockNumber = parseInt(
        transactions[transactions.length - 1].blockNumber,
      );
      await manager.save(BlockState, {
        id: 'latest',
        lastProcessedBlock: lastBlockNumber.toString(),
      });
    });

    this.logger.log(
      `💾 Processed ${transactions.length} transactions, updated ${holders.length} holder balances`,
    );
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

      // Get the current block number from the API
      const latestBlockResponse = await axios.get(this.FRAXSCAN_API_URL, {
        params: {
          module: 'proxy',
          action: 'eth_blockNumber',
          apikey: this.configService.get('FRAXSCAN_API_KEY'),
        },
      });

      const currentBlock = parseInt(latestBlockResponse.data.result, 16);

      // Process in chunks of 100,000 blocks to stay within API limits
      const BLOCK_CHUNK_SIZE = 100000;
      let processedBlock = startBlock;

      while (processedBlock < currentBlock) {
        const endBlock = Math.min(
          processedBlock + BLOCK_CHUNK_SIZE,
          currentBlock,
        );
        const transactions = await this.fetchTransactionPage(
          processedBlock,
          endBlock,
        );

        await this.processTransactions(transactions);

        processedBlock = endBlock + 1;

        // Add delay between requests to respect rate limits
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      this.logger.log(
        `✅ Synchronization completed. Processed blocks from ${startBlock} to ${currentBlock}`,
      );
    } catch (error) {
      this.logger.error('Error during sync:', error);
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
