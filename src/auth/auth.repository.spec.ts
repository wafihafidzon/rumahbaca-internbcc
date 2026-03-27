import { ConflictException } from '@nestjs/common';
import { AuthProvider } from '@prisma/client';
import { AuthRepository } from './auth.repository';

const makeUser = (overrides: Record<string, unknown> = {}) => ({
  id: 'user-id',
  email: 'user@example.com',
  username: 'user',
  password: null,
  name: 'User',
  bio: null,
  avatarUrl: null,
  isActive: true,
  provider: AuthProvider.LOCAL,
  googleId: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  roles: [{ role: { name: 'USER' } }],
  ...overrides,
});

describe('AuthRepository', () => {
  const tx = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
  };

  const prisma = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
      callback(tx),
    ),
  };

  let repository: AuthRepository;

  beforeEach(() => {
    repository = new AuthRepository(prisma as never);
    tx.user.findUnique.mockReset();
    tx.user.update.mockReset();
    tx.user.create.mockReset();
    prisma.$transaction.mockImplementation(
      (callback: (client: typeof tx) => unknown) => callback(tx),
    );
  });

  it('updates existing user when found by googleId', async () => {
    tx.user.findUnique.mockResolvedValueOnce(
      makeUser({ googleId: 'google-123' }),
    );
    tx.user.update.mockResolvedValue(makeUser({ googleId: 'google-123' }));

    const result = await repository.upsertGoogleUser({
      googleId: 'google-123',
      email: 'user@example.com',
      name: 'Updated Name',
      avatarUrl: 'https://avatar.test',
    });

    expect(result.googleId).toBe('google-123');
    expect(tx.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          provider: AuthProvider.GOOGLE,
          email: 'user@example.com',
          name: 'Updated Name',
        }),
      }),
    );
  });

  it('links existing email user to google when eligible', async () => {
    tx.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(makeUser({ email: 'user@example.com' }));
    tx.user.update.mockResolvedValue(
      makeUser({
        email: 'user@example.com',
        googleId: 'google-123',
        provider: AuthProvider.GOOGLE,
      }),
    );

    const result = await repository.upsertGoogleUser({
      googleId: 'google-123',
      email: 'user@example.com',
      name: 'User',
      avatarUrl: null,
    });

    expect(result.googleId).toBe('google-123');
    expect(tx.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          googleId: 'google-123',
          provider: AuthProvider.GOOGLE,
        }),
      }),
    );
  });

  it('throws conflict when email is linked to a different googleId', async () => {
    tx.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(
      makeUser({
        email: 'user@example.com',
        provider: AuthProvider.GOOGLE,
        googleId: 'other-google-id',
      }),
    );

    await expect(
      repository.upsertGoogleUser({
        googleId: 'google-123',
        email: 'user@example.com',
        name: 'User',
        avatarUrl: null,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('retries username creation when username unique conflict occurs', async () => {
    tx.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    tx.user.create
      .mockRejectedValueOnce({
        code: 'P2002',
        meta: { target: ['username'] },
      })
      .mockResolvedValueOnce(
        makeUser({
          provider: AuthProvider.GOOGLE,
          googleId: 'google-123',
        }),
      );

    const result = await repository.upsertGoogleUser({
      googleId: 'google-123',
      email: 'user@example.com',
      name: 'User',
      avatarUrl: null,
    });

    expect(result.provider).toBe(AuthProvider.GOOGLE);
    expect(tx.user.create).toHaveBeenCalledTimes(2);
  });
});
