import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CacheModule } from '../common/cache/cache.module';
import { LoggerModule } from '../common/logger/logger.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ReadingStreakModule } from '../reading-streak/reading-streak.module';
import { ReadingTrackerModule } from '../reading-tracker/reading-tracker.module';
import { ReadingDashboardController } from './reading-dashboard.controller';
import { ReadingDashboardService } from './reading-dashboard.service';

@Module({
  imports: [
    PrismaModule,
    LoggerModule,
    CacheModule,
    AuthModule,
    ReadingTrackerModule,
    ReadingStreakModule,
  ],
  controllers: [ReadingDashboardController],
  providers: [ReadingDashboardService],
  exports: [ReadingDashboardService],
})
export class ReadingDashboardModule {}
