import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { CustomLoggerService } from '../common/logger/logger.service';
import { FriendRequestRepository } from './friend-request.repository';
import { CreateFriendRequestDto } from './dto/create-friend-request.dto';
import { FriendRequestQueryDto } from './dto/friend-request-query.dto';
import { RespondFriendRequestDto } from './dto/respond-friend-request.dto';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/interfaces/auth.interface';

@Injectable()
export class FriendRequestService {
  constructor(
    private readonly repo: FriendRequestRepository,
    private readonly logger: CustomLoggerService,
    private readonly prisma: PrismaService,
  ) {}

  async create(currentUser: JwtPayload, dto: CreateFriendRequestDto) {
    const senderId = currentUser.sub;
    const { receiverId } = dto;

    // Check sender ≠ receiver
    if (senderId === receiverId) {
      throw new BadRequestException(
        'You cannot send a friend request to yourself',
      );
    }

    // Check receiver exists
    const receiver = await this.prisma.user.findUnique({
      where: { id: receiverId },
    });
    if (!receiver) {
      throw new NotFoundException('Receiver not found');
    }

    // Check users aren't already friends
    const existingFriendship = await this.repo.checkFriendship(
      senderId,
      receiverId,
    );
    if (existingFriendship) {
      throw new ConflictException('You are already friends with this user');
    }

    // Check no pending request exists
    const existingRequest = await this.repo.findBySenderAndReceiver(
      senderId,
      receiverId,
    );
    if (existingRequest && existingRequest.status === 'PENDING') {
      throw new ConflictException('A pending friend request already exists');
    }

    this.logger.log(
      `Friend request created from ${senderId} to ${receiverId}`,
      'FriendRequestService',
    );

    return this.repo.create(senderId, receiverId);
  }

  async findByType(currentUser: JwtPayload, query: FriendRequestQueryDto) {
    const { type, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    if (type === 'received') {
      const { requests, total } = await this.repo.findPendingByReceiver(
        currentUser.sub,
        skip,
        limit,
      );
      return this.buildPaginatedResponse(requests, page, limit, total);
    } else {
      const { requests, total } = await this.repo.findPendingBySender(
        currentUser.sub,
        skip,
        limit,
      );
      return this.buildPaginatedResponse(requests, page, limit, total);
    }
  }

  async respond(
    currentUser: JwtPayload,
    requestId: string,
    dto: RespondFriendRequestDto,
  ) {
    const request = await this.repo.findById(requestId);
    if (!request) {
      throw new NotFoundException('Friend request not found');
    }

    const { action } = dto;

    if (action === 'accept') {
      // Only receiver can accept
      if (request.receiverId !== currentUser.sub) {
        throw new ForbiddenException(
          'Only the receiver can accept this request',
        );
      }

      this.logger.log(
        `Friend request ${requestId} accepted by ${currentUser.sub}`,
        'FriendRequestService',
      );

      return this.repo.acceptAndCreateFriendship(
        requestId,
        request.senderId,
        request.receiverId,
      );
    } else if (action === 'reject') {
      // Only receiver can reject
      if (request.receiverId !== currentUser.sub) {
        throw new ForbiddenException(
          'Only the receiver can reject this request',
        );
      }

      this.logger.log(
        `Friend request ${requestId} rejected by ${currentUser.sub}`,
        'FriendRequestService',
      );

      return this.repo.updateStatus(requestId, 'REJECTED');
    } else if (action === 'cancel') {
      // Only sender can cancel
      if (request.senderId !== currentUser.sub) {
        throw new ForbiddenException('Only the sender can cancel this request');
      }

      this.logger.log(
        `Friend request ${requestId} cancelled by ${currentUser.sub}`,
        'FriendRequestService',
      );

      return this.repo.updateStatus(requestId, 'CANCELLED');
    }

    throw new BadRequestException('Invalid action');
  }

  private buildPaginatedResponse(
    items: any[],
    page: number,
    limit: number,
    total: number,
  ) {
    const totalPages = Math.ceil(total / limit);
    return {
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }
}
