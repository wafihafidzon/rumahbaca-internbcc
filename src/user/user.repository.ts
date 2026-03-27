import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { UserWithRolesRelations } from '../common/types/user.types';

const userRoleInclude = {
  roles: {
    include: {
      role: true,
    },
  },
} as const;

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findManyWithAcl(
    where: Prisma.UserWhereInput,
    skip: number,
    take: number,
  ): Promise<UserWithRolesRelations[]> {
    return (await this.prisma.user.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: userRoleInclude,
    })) as UserWithRolesRelations[];
  }

  async count(where: Prisma.UserWhereInput): Promise<number> {
    return this.prisma.user.count({ where });
  }

  async findByIdWithAcl(id: string): Promise<UserWithRolesRelations | null> {
    return await this.prisma.user.findUnique({
      where: { id },
      include: userRoleInclude,
    });
  }

  async findByEmailOrUsername(
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

  async createUser(
    data: Prisma.UserCreateInput,
  ): Promise<UserWithRolesRelations> {
    return await this.prisma.user.create({
      data,
      include: userRoleInclude,
    });
  }

  async updateUser(
    id: string,
    data: Prisma.UserUpdateInput,
  ): Promise<UserWithRolesRelations> {
    return await this.prisma.user.update({
      where: { id },
      data,
      include: userRoleInclude,
    });
  }

  async deleteUser(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }

  async updateAvatar(
    id: string,
    avatarUrl: string,
  ): Promise<UserWithRolesRelations> {
    return await this.prisma.user.update({
      where: { id },
      data: { avatarUrl },
      include: userRoleInclude,
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }
}
