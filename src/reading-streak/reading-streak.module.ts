import { Module } from '@nestjs/common';
import { LoggerModule } from '../common/logger/logger.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ReadingStreakController } from './reading-streak.controller';
import { ReadingStreakRepository } from './reading-streak.repository';
import { ReadingStreakService } from './reading-streak.service';

@Module({
  imports: [PrismaModule, LoggerModule],
  controllers: [ReadingStreakController],
  providers: [ReadingStreakService, ReadingStreakRepository],
  exports: [ReadingStreakService],
})
export class ReadingStreakModule {}
