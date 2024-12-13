import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Available fields for sorting holder data
 */
export enum SortBy {
  /** Sort by holder's token balance */
  BALANCE = 'balance',
  /** Sort by holder's wallet address */
  ADDRESS = 'address',
  /** Sort by holder's percentage of total supply */
  PERCENTAGE = 'percentage',
}

/**
 * Sort order options
 */
export enum Order {
  /** Ascending order (A-Z, 0-9) */
  ASC = 'asc',
  /** Descending order (Z-A, 9-0) */
  DESC = 'desc',
}

/**
 * Data transfer object for pagination and sorting parameters
 * @example
 * {
 *   page: 1,
 *   limit: 10,
 *   sortBy: 'balance',
 *   order: 'desc'
 * }
 */
export class PaginationQueryDto {
  @ApiProperty({
    description: 'Page number (starts from 1)',
    minimum: 1,
    default: 1,
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiProperty({
    description: 'Number of items per page',
    minimum: 1,
    maximum: 100,
    default: 10,
    example: 10,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;

  @ApiProperty({
    description: 'Field to sort by',
    enum: SortBy,
    default: SortBy.BALANCE,
    example: SortBy.BALANCE,
  })
  @IsEnum(SortBy)
  @IsOptional()
  sortBy: SortBy = SortBy.BALANCE;

  @ApiProperty({
    description: 'Sort order',
    enum: Order,
    default: Order.DESC,
    example: Order.DESC,
  })
  @IsEnum(Order)
  @IsOptional()
  order: Order = Order.DESC;
}

export class PaginatedHoldersResponse {
  data: {
    address: string;
    balance: string;
    percentage: string;
  }[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
