import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LoggerModule } from '../common/logger/logger.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ReadingSessionModule } from '../reading-session/reading-session.module';
import { RoomInvitesModule } from '../room-invites/room-invites.module';
import { RoomsController } from './rooms.controller';
import { RoomsRepository } from './rooms.repository';
import { RoomsService } from './rooms.service';

@Module({
  imports: [
    PrismaModule,
    LoggerModule,
    AuthModule,
    ReadingSessionModule,
    RoomInvitesModule,
  ],
  controllers: [RoomsController],
  providers: [RoomsService, RoomsRepository],
  exports: [RoomsService],
})
export class RoomsModule {}
