import {
  PaginatedHoldersResponse,
  PaginationQueryDto,
} from '../dto/pagination.dto';
import { Repository } from 'typeorm';
import BigNumber from 'bignumber.js';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Holder } from '../entities/holder.entity';

@Injectable()
export class HoldersService {
  constructor(
    @InjectRepository(Holder)
    private readonly holdersRepository: Repository<Holder>,
  ) {}

  async getHolders(
    query: PaginationQueryDto,
  ): Promise<PaginatedHoldersResponse> {
    if (query.sortBy === 'percentage') {
      // For percentage sorting, we need to sort by balance since percentage is derived from balance
      const [holders, total] = await this.holdersRepository.findAndCount({
        order: { balance: query.order.toUpperCase() as 'ASC' | 'DESC' },
        take: query.limit,
        skip: (query.page - 1) * query.limit,
      });
      return this.processHoldersResponse(holders, total, query);
    }

    // For other fields, use direct sorting
    const [holders, total] = await this.holdersRepository.findAndCount({
      order: { [query.sortBy]: query.order.toUpperCase() },
      take: query.limit,
      skip: (query.page - 1) * query.limit,
    });
    return this.processHoldersResponse(holders, total, query);
  }

  private async processHoldersResponse(
    holders: Holder[],
    total: number,
    query: PaginationQueryDto,
  ): Promise<PaginatedHoldersResponse> {
    const totalSupply = await this.holdersRepository
      .createQueryBuilder('holder')
      .select('SUM(CAST(holder.balance AS DECIMAL(78,18)))', 'total')
      .getRawOne();

    const enrichedHolders = holders.map((holder) => ({
      ...holder,
      percentage: new BigNumber(holder.balance)
        .dividedBy(totalSupply.total || 1)
        .multipliedBy(100)
        .toFixed(10),
    }));

    const totalPages = Math.ceil(total / query.limit);

    return {
      data: enrichedHolders,
      total,
      page: query.page,
      limit: query.limit,
      totalPages,
      hasNextPage: query.page < totalPages,
      hasPreviousPage: query.page > 1,
    };
  }
}
