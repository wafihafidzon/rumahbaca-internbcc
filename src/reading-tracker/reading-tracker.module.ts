import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BookModule } from '../book/book.module';
import { CacheModule } from '../common/cache/cache.module';
import { LoggerModule } from '../common/logger/logger.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ReadingTrackerController } from './reading-tracker.controller';
import { ReadingTrackerRepository } from './reading-tracker.repository';
import { ReadingTrackerService } from './reading-tracker.service';

@Module({
  imports: [PrismaModule, LoggerModule, CacheModule, AuthModule, BookModule],
  controllers: [ReadingTrackerController],
  providers: [ReadingTrackerService, ReadingTrackerRepository],
  exports: [ReadingTrackerService, ReadingTrackerRepository],
})
export class ReadingTrackerModule {}
