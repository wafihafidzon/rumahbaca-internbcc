import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthProvider, Prisma, RefreshToken, User } from '@prisma/client';
import { UserWithRolesRelations } from '../common/types/user.types';
import { randomBytes } from 'crypto';

const userRoleInclude = {
  roles: {
    include: {
      role: true,
    },
  },
} as const;

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly usernameMaxRetries = 5;

  // ─── User ─────────────────────────────────────────────────────────────────

  async findUserByEmailWithRoles(
    email: string,
  ): Promise<UserWithRolesRelations | null> {
    return await this.prisma.user.findUnique({
      where: { email },
      include: userRoleInclude,
    });
  }

  async findUserByIdWithRoles(
    id: string,
  ): Promise<UserWithRolesRelations | null> {
    return await this.prisma.user.findUnique({
      where: { id },
      include: userRoleInclude,
    });
  }

  async findUserByEmailOrUsername(
    email: string,
    username: string,
  ): Promise<UserWithRolesRelations | null> {
    return await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
      include: userRoleInclude,
    });
  }

  async createUser(data: {
    email: string;
    username: string;
    name: string;
    password?: string;
    avatarUrl?: string;
    provider?: AuthProvider;
    googleId?: string;
  }): Promise<UserWithRolesRelations> {
    return await this.prisma.user.create({
      data: {
        ...data,
        roles: {
          create: {
            role: {
              connect: { name: 'USER' },
            },
          },
        },
      },
      include: userRoleInclude,
    });
  }

  async upsertGoogleUser(data: {
    googleId: string;
    email: string;
    name: string;
    avatarUrl?: string | null;
  }): Promise<UserWithRolesRelations> {
    return this.prisma.$transaction(async (tx) => {
      const existingByGoogleId = await tx.user.findUnique({
        where: { googleId: data.googleId },
        include: userRoleInclude,
      });

      if (existingByGoogleId) {
        return tx.user.update({
          where: { id: existingByGoogleId.id },
          data: {
            email: data.email,
            provider: AuthProvider.GOOGLE,
            name: data.name ?? existingByGoogleId.name,
            avatarUrl: data.avatarUrl ?? existingByGoogleId.avatarUrl,
          },
          include: userRoleInclude,
        });
      }

      const existingByEmail = await tx.user.findUnique({
        where: { email: data.email },
        include: userRoleInclude,
      });

      if (existingByEmail) {
        if (!existingByEmail.isActive) {
          throw new ConflictException(
            'Cannot link Google account to an inactive user',
          );
        }

        if (
          existingByEmail.googleId &&
          existingByEmail.googleId !== data.googleId
        ) {
          throw new ConflictException(
            'Email is already linked to another Google account',
          );
        }

        if (
          existingByEmail.provider === AuthProvider.GOOGLE &&
          !existingByEmail.googleId
        ) {
          throw new ConflictException(
            'Ambiguous Google account state for existing user',
          );
        }

        return tx.user.update({
          where: { id: existingByEmail.id },
          data: {
            googleId: data.googleId,
            provider: AuthProvider.GOOGLE,
            name: data.name ?? existingByEmail.name,
            avatarUrl: data.avatarUrl ?? existingByEmail.avatarUrl,
          },
          include: userRoleInclude,
        });
      }

      return this.createGoogleUserWithRetry(tx, data);
    });
  }

  // ─── Refresh Token ─────────────────────────────────────────────────────────

  async createRefreshToken(
    userId: string,
    hashedToken: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.prisma.refreshToken.create({
      data: { token: hashedToken, userId, expiresAt },
    });
  }

  async findRefreshTokensByUserId(userId: string): Promise<RefreshToken[]> {
    return this.prisma.refreshToken.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
    });
  }

  async deleteRefreshTokensByUserId(userId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
  }

  private async createGoogleUserWithRetry(
    tx: Prisma.TransactionClient,
    data: {
      googleId: string;
      email: string;
      name: string;
      avatarUrl?: string | null;
    },
  ): Promise<UserWithRolesRelations> {
    const baseUsername = this.normalizeUsernameBase(data.email.split('@')[0]);

    for (let attempt = 0; attempt < this.usernameMaxRetries; attempt++) {
      const username =
        attempt === 0
          ? baseUsername
          : `${baseUsername}_${this.randomSuffix(4)}`;

      try {
        return await tx.user.create({
          data: {
            email: data.email,
            username,
            name: data.name,
            avatarUrl: data.avatarUrl ?? undefined,
            googleId: data.googleId,
            provider: AuthProvider.GOOGLE,
            roles: {
              create: {
                role: {
                  connect: { name: 'USER' },
                },
              },
            },
          },
          include: userRoleInclude,
        });
      } catch (error) {
        if (this.isUniqueViolation(error, 'username')) {
          continue;
        }
        throw error;
      }
    }

    throw new ConflictException(
      'Unable to generate a unique username for Google account',
    );
  }

  private normalizeUsernameBase(value: string): string {
    const sanitized = value
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');

    return sanitized || 'user';
  }

  private randomSuffix(length: number): string {
    return randomBytes(length).toString('hex').slice(0, length);
  }

  private isUniqueViolation(
    error: unknown,
    field: keyof Pick<User, 'username' | 'email' | 'googleId'>,
  ): boolean {
    if (
      !error ||
      typeof error !== 'object' ||
      !('code' in error) ||
      error.code !== 'P2002'
    ) {
      return false;
    }

    const errorWithMeta = error as { meta?: { target?: unknown } };
    const target =
      errorWithMeta.meta && typeof errorWithMeta.meta === 'object'
        ? errorWithMeta.meta.target
        : undefined;

    return (
      Array.isArray(target) &&
      target.some((item) => String(item).toLowerCase() === field)
    );
  }
}
