import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HoldersService } from './holders.service';
import { Holder } from '../entities/holder.entity';
import { HoldersController } from './holders.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Holder])],
  controllers: [HoldersController],
  providers: [HoldersService],
})
export class HoldersModule {}
