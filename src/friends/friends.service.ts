import { Injectable, NotFoundException } from '@nestjs/common';
import { CustomLoggerService } from '../common/logger/logger.service';
import { FriendsRepository } from './friends.repository';
import { FriendsQueryDto } from './dto/friends-query.dto';
import { PaginationMetaDto } from '../common/dto/pagination.dto';
import { FriendResponseDto } from './dto/friends-response.dto';

@Injectable()
export class FriendsService {
  constructor(
    private readonly repo: FriendsRepository,
    private readonly logger: CustomLoggerService,
  ) {}

  async findAll(userId: string, query: FriendsQueryDto) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;
    const { friendships, total } = await this.repo.findMany(
      userId,
      skip,
      limit,
    );

    const data: FriendResponseDto[] = friendships.map((friendship) => {
      const friend =
        friendship.userId1 === userId ? friendship.user2 : friendship.user1;

      return {
        friendId: friend.id,
        username: friend.username,
        name: friend.name,
        avatarUrl: friend.avatarUrl,
        friendsSince: friendship.createdAt,
      };
    });

    const totalPages = Math.ceil(total / limit);
    const meta: PaginationMetaDto = {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };

    return { data, meta };
  }

  async remove(currentUserId: string, friendId: string) {
    const friendship = await this.repo.findFriendship(currentUserId, friendId);

    if (!friendship) {
      throw new NotFoundException('Friendship not found');
    }

    await this.repo.deleteFriendship(friendship.id);
    this.logger.log(
      `Friendship removed between ${currentUserId} and ${friendId}`,
      'FriendsService',
    );
  }
}
