import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LoggerModule } from '../common/logger/logger.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RoomInvitesController } from './room-invites.controller';
import { RoomInvitesRepository } from './room-invites.repository';
import { RoomInvitesService } from './room-invites.service';

@Module({
  imports: [PrismaModule, LoggerModule, AuthModule],
  controllers: [RoomInvitesController],
  providers: [RoomInvitesService, RoomInvitesRepository],
  exports: [RoomInvitesService, RoomInvitesRepository],
})
export class RoomInvitesModule {}
