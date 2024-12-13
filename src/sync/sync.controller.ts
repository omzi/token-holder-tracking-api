import {
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { SyncService } from './sync.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('sync')
@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Manually trigger blockchain sync',
    description:
      'Synchronizes token transfer events from the blockchain and updates holder balances',
  })
  @ApiResponse({
    status: 200,
    description: 'Sync triggered successfully',
  })
  @ApiResponse({
    status: 409,
    description: 'Sync already in progress',
  })
  @ApiResponse({
    status: 500,
    description: 'Sync failed',
  })
  async syncData() {
    try {
      const isSyncing = await this.syncService.checkSyncStatus();
      if (isSyncing) {
        throw new HttpException(
          'Sync already in progress',
          HttpStatus.CONFLICT,
        );
      }
      await this.syncService.sync();
      return { message: 'Sync completed successfully' };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
