import { HoldersService } from './holders.service';
import { Controller, Get, Query } from '@nestjs/common';
import { PaginationQueryDto } from '../dto/pagination.dto';
import { ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';

/**
 * Controller responsible for token holder-related operations
 * Provides endpoints for retrieving holder information with pagination and sorting
 */
@ApiTags('holders')
@Controller('holders')
export class HoldersController {
  constructor(private readonly holdersService: HoldersService) {}

  /**
   * Retrieves a paginated list of token holders with their balances and rankings
   * @param query Pagination and sorting parameters
   * @returns Paginated list of holders with their balances, percentages, and rankings
   */
  @Get()
  @ApiOperation({
    summary: 'Get paginated list of token holders',
    description:
      'Retrieves token holders with their balances, percentages, and rankings',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (starts from 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of items per page (max 100)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of holders retrieved successfully',
    schema: {
      example: {
        data: [
          {
            address: '0x123...',
            balance: '1000000000000000000',
            percentage: '10.5000000000',
          },
        ],
        total: 100,
        page: 1,
        limit: 10,
        totalPages: 10,
        hasNextPage: true,
        hasPreviousPage: false,
      },
    },
  })
  async getHolders(@Query() query: PaginationQueryDto) {
    return this.holdersService.getHolders(query);
  }
}
