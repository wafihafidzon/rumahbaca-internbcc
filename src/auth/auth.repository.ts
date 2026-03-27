import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RefreshToken } from '@prisma/client';
import { UserWithRolesRelations } from '../common/types/user.types';

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
    provider?: 'LOCAL' | 'GOOGLE';
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
    const existingByGoogleId = await this.prisma.user.findUnique({
      where: { googleId: data.googleId },
      include: userRoleInclude,
    });
    if (existingByGoogleId) {
      return existingByGoogleId;
    }

    const existingByEmail = await this.prisma.user.findUnique({
      where: { email: data.email },
      include: userRoleInclude,
    });

    if (existingByEmail) {
      return await this.prisma.user.update({
        where: { id: existingByEmail.id },
        data: {
          googleId: data.googleId,
          provider: 'GOOGLE',
          name: data.name || existingByEmail.name,
          avatarUrl: data.avatarUrl ?? existingByEmail.avatarUrl,
        },
        include: userRoleInclude,
      });
    }

    return await this.createUser({
      email: data.email,
      username: data.email.split('@')[0],
      name: data.name,
      avatarUrl: data.avatarUrl ?? undefined,
      googleId: data.googleId,
      provider: 'GOOGLE',
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
}
