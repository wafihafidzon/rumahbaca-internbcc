import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { FriendsService } from './friends.service';
import { FriendsRepository } from './friends.repository';
import { CustomLoggerService } from '../common/logger/logger.service';

const mockRepo = {
  findMany: jest.fn(),
  findFriendship: jest.fn(),
  deleteFriendship: jest.fn(),
};

const mockLogger = {
  log: jest.fn(),
  error: jest.fn(),
};

describe('FriendsService', () => {
  let service: FriendsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FriendsService,
        { provide: FriendsRepository, useValue: mockRepo },
        { provide: CustomLoggerService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<FriendsService>(FriendsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── findAll() ───────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('should return paginated list with correct friendId (the other user, not current user)', async () => {
      const userId = 'user-a';
      const friendId = 'user-b';
      const createdAt = new Date();

      const friendship = {
        id: 'friendship-id',
        userId1: userId,
        userId2: friendId,
        createdAt,
        user1: {
          id: userId,
          username: 'userA',
          name: 'User A',
          avatarUrl: null,
        },
        user2: {
          id: friendId,
          username: 'userB',
          name: 'User B',
          avatarUrl: null,
        },
      };

      mockRepo.findMany.mockResolvedValue({
        friendships: [friendship],
        total: 1,
      });

      const result = await service.findAll(userId, { page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].friendId).toBe(friendId);
      expect(result.data[0].username).toBe('userB');
      expect(result.data[0].name).toBe('User B');
      expect(result.data[0].friendsSince).toBe(createdAt);
    });
  });

  // ─── remove() ────────────────────────────────────────────────────────────────

  describe('remove()', () => {
    it('should throw NotFoundException when friendship does not exist', async () => {
      mockRepo.findFriendship.mockResolvedValue(null);

      await expect(service.remove('user-a', 'user-b')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should delete the Friendship record', async () => {
      const friendship = {
        id: 'friendship-id',
        userId1: 'user-a',
        userId2: 'user-b',
      };
      mockRepo.findFriendship.mockResolvedValue(friendship);
      mockRepo.deleteFriendship.mockResolvedValue(friendship);

      await service.remove('user-a', 'user-b');

      expect(mockRepo.findFriendship).toHaveBeenCalledWith('user-a', 'user-b');
      expect(mockRepo.deleteFriendship).toHaveBeenCalledWith('friendship-id');
    });

    it('should NOT delete FriendRequest records (only deleteFriendship is called)', async () => {
      const friendship = {
        id: 'friendship-id',
        userId1: 'user-a',
        userId2: 'user-b',
      };
      mockRepo.findFriendship.mockResolvedValue(friendship);
      mockRepo.deleteFriendship.mockResolvedValue(friendship);

      await service.remove('user-a', 'user-b');

      // Only the friendship deletion method is called — no FriendRequest methods exist on this repo
      expect(mockRepo.deleteFriendship).toHaveBeenCalledTimes(1);
      expect(Object.keys(mockRepo)).toEqual([
        'findMany',
        'findFriendship',
        'deleteFriendship',
      ]);
    });
  });
});
