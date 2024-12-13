import { Module } from '@nestjs/common';
import { SyncService } from './sync.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { SyncController } from './sync.controller';
import { Holder } from '../entities/holder.entity';
import { BlockState } from '../entities/blockstate.entity';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([Holder, BlockState]),
    ConfigModule,
  ],
  controllers: [SyncController],
  providers: [SyncService],
})
export class SyncModule {}
