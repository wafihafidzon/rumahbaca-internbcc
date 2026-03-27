import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LoggerModule } from '../common/logger/logger.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ReadingTrackerModule } from '../reading-tracker/reading-tracker.module';
import { ReadingSessionController } from './reading-session.controller';
import { ReadingSessionRepository } from './reading-session.repository';
import { ReadingSessionService } from './reading-session.service';

@Module({
  imports: [PrismaModule, LoggerModule, AuthModule, ReadingTrackerModule],
  controllers: [ReadingSessionController],
  providers: [ReadingSessionService, ReadingSessionRepository],
  exports: [ReadingSessionService, ReadingSessionRepository],
})
export class ReadingSessionModule {}
