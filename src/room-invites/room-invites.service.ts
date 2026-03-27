import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RoomInviteStatus } from '@prisma/client';
import type { JwtPayload } from '../auth/interfaces/auth.interface';
import { CustomLoggerService } from '../common/logger/logger.service';
import { RoomInvitesRepository } from './room-invites.repository';
import { RespondInviteDto, RoomInviteAction } from './dto/respond-invite.dto';

@Injectable()
export class RoomInvitesService {
  constructor(
    private readonly repo: RoomInvitesRepository,
    private readonly logger: CustomLoggerService,
  ) {}

  async create(roomId: string, inviteeId: string) {
    this.logger.log(
      `Room invite created for room ${roomId} and invitee ${inviteeId}`,
      'RoomInvitesService',
    );
    return this.repo.create(roomId, inviteeId);
  }

  async findFriendship(userAId: string, userBId: string) {
    return this.repo.findFriendship(userAId, userBId);
  }

  async findMembership(roomId: string, userId: string) {
    return this.repo.findMembership(roomId, userId);
  }

  async findPendingByRoomAndInvitee(roomId: string, inviteeId: string) {
    return this.repo.findPendingByRoomAndInvitee(roomId, inviteeId);
  }

  async findPending(currentUser: JwtPayload) {
    return this.repo.findPendingByInvitee(currentUser.sub);
  }

  async respond(
    currentUser: JwtPayload,
    inviteId: string,
    dto: RespondInviteDto,
  ) {
    const invite = await this.repo.findById(inviteId);
    if (!invite) {
      throw new NotFoundException('Room invite not found');
    }

    if (invite.inviteeId !== currentUser.sub) {
      throw new ForbiddenException(
        'You are not allowed to respond to this invite',
      );
    }

    if (invite.status !== RoomInviteStatus.PENDING) {
      throw new ConflictException('This invite is no longer pending');
    }

    if (dto.action === RoomInviteAction.ACCEPT) {
      this.logger.log(
        `Room invite ${inviteId} accepted by ${currentUser.sub}`,
        'RoomInvitesService',
      );
      return this.repo.acceptAndCreateMember(
        invite.id,
        currentUser.sub,
        invite.room.bookId,
      );
    }

    this.logger.log(
      `Room invite ${inviteId} rejected by ${currentUser.sub}`,
      'RoomInvitesService',
    );
    return this.repo.updateStatus(invite.id, RoomInviteStatus.REJECTED);
  }
}
