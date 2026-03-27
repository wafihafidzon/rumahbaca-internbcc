import { Module } from '@nestjs/common';
import { LoggerModule } from '../common/logger/logger.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ReadingStreakRepository } from './reading-streak.repository';
import { ReadingStreakService } from './reading-streak.service';

@Module({
  imports: [PrismaModule, LoggerModule],
  providers: [ReadingStreakService, ReadingStreakRepository],
  exports: [ReadingStreakService],
})
export class ReadingStreakModule {}
