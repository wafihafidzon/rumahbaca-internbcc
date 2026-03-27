import { PrismaClient, User, RefreshToken, Role } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { PrismaPg } from '@prisma/adapter-pg';
import * as pg from 'pg';
import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcryptjs';
import type { StringValue } from 'ms';

const refreshExpiration: StringValue =
  (process.env.JWT_REFRESH_EXPIRATION as StringValue) ?? '7d';

const jwtRefreshService = new JwtService({
  secret: process.env.JWT_REFRESH_SECRET ?? 'refresh_secret_dev',
  signOptions: {
    expiresIn: refreshExpiration,
  },
});

async function main() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    console.log('🌱 Starting database seeding...');

    await prisma.refreshToken.deleteMany();
    await prisma.readingSession.deleteMany();
    await prisma.userReadingStreakDay.deleteMany();
    await prisma.userReadingStreak.deleteMany();
    await prisma.readingTracker.deleteMany();
    await prisma.roomCommentLike.deleteMany();
    await prisma.roomComment.deleteMany();
    await prisma.roomMember.deleteMany();
    await prisma.roomInvite.deleteMany();
    await prisma.readingRoom.deleteMany();
    await prisma.friendRequest.deleteMany();
    await prisma.friendship.deleteMany();
    await prisma.userRole.deleteMany();
    await prisma.role.deleteMany();
    await prisma.user.deleteMany();
    await prisma.book.deleteMany();

    const roleNames = ['ADMIN', 'MODERATOR', 'USER'] as const;
    const createdRoles: Role[] = [];

    for (const name of roleNames) {
      createdRoles.push(await prisma.role.create({ data: { name } }));
    }

    const getRoleId = (name: string) =>
      createdRoles.find((role) => role.name === name)?.id ?? '';

    const users: User[] = [];
    const refreshTokens: RefreshToken[] = [];

    const fixedAdminPassword = await bcrypt.hash('Admin123!', 10);
    users.push(
      await prisma.user.create({
        data: {
          email: 'admin@example.com',
          username: 'superadmin',
          name: 'Super Admin',
          password: fixedAdminPassword,
          provider: 'LOCAL',
          isActive: true,
          roles: {
            create: {
              roleId: getRoleId('ADMIN'),
            },
          },
        },
      }),
    );

    for (let i = 0; i < 5; i++) {
      const password = await bcrypt.hash('user123', 10);
      users.push(
        await prisma.user.create({
          data: {
            email: faker.internet.email(),
            username: faker.internet.username().toLowerCase(),
            name: faker.person.fullName(),
            bio: faker.lorem.sentence(),
            password,
            provider: 'LOCAL',
            isActive: true,
            roles: {
              create: {
                roleId: getRoleId('USER'),
              },
            },
          },
        }),
      );
    }

    for (const user of users) {
      const refreshTokenValue = await jwtRefreshService.signAsync({
        sub: user.id,
        email: user.email,
      });
      const decoded = jwtRefreshService.decode(refreshTokenValue) as {
        exp: number;
      };
      const hashedToken = await bcrypt.hash(refreshTokenValue, 10);
      refreshTokens.push(
        await prisma.refreshToken.create({
          data: {
            token: hashedToken,
            userId: user.id,
            expiresAt: new Date(decoded.exp * 1000),
          },
        }),
      );
    }

    console.log(`✅ Seed complete`);
    console.log(`Users: ${users.length}`);
    console.log(`Roles: ${createdRoles.length}`);
    console.log(`Refresh Tokens: ${refreshTokens.length}`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('❌ Error seeding database:', error);
  process.exit(1);
});
