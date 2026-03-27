import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { CustomLoggerService } from '../common/logger/logger.service';
import { AppConfigService } from '../config/app-config.service';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs');

const mockUserWithRoles = {
  id: 'user-id-1',
  email: 'test@example.com',
  username: 'testuser',
  password: '$2b$10$hashedpassword',
  name: 'Test User',
  bio: null,
  avatarUrl: null,
  isActive: true,
  provider: 'LOCAL',
  googleId: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  roles: [{ role: { name: 'USER' } }],
};

const mockAuthRepository = {
  findUserByEmailWithRoles: jest.fn(),
  findUserByIdWithRoles: jest.fn(),
  findUserByEmailOrUsername: jest.fn(),
  createUser: jest.fn(),
  upsertGoogleUser: jest.fn(),
  createRefreshToken: jest.fn(),
  findRefreshTokensByUserId: jest.fn(),
  deleteRefreshTokensByUserId: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn(),
  verify: jest.fn(),
};

const mockLogger = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

const mockAppConfig = {
  jwt: {
    secret: 'test-secret',
    expiration: '15m',
    refreshSecret: 'test-refresh-secret',
    refreshExpiration: '7d',
  },
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: AuthRepository, useValue: mockAuthRepository },
        { provide: JwtService, useValue: mockJwtService },
        { provide: CustomLoggerService, useValue: mockLogger },
        { provide: AppConfigService, useValue: mockAppConfig },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('validateUser throws for missing user', async () => {
    mockAuthRepository.findUserByEmailWithRoles.mockResolvedValue(null);
    await expect(
      service.validateUser('missing@example.com', 'password'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('validateUser throws when password is invalid', async () => {
    mockAuthRepository.findUserByEmailWithRoles.mockResolvedValue(
      mockUserWithRoles,
    );
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      service.validateUser('test@example.com', 'wrong-password'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('validateUser returns user with roles on success', async () => {
    mockAuthRepository.findUserByEmailWithRoles.mockResolvedValue(
      mockUserWithRoles,
    );
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const result = await service.validateUser('test@example.com', 'password');

    expect(result.roles).toEqual(['USER']);
  });

  it('login issues access and refresh token', async () => {
    mockJwtService.sign
      .mockReturnValueOnce('access-token')
      .mockReturnValueOnce('refresh-token');
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-refresh-token');
    mockAuthRepository.createRefreshToken.mockResolvedValue(undefined);

    const result = await service.login({
      id: 'user-id-1',
      email: 'test@example.com',
      username: 'testuser',
      roles: ['USER'],
    });

    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('refresh-token');
    expect(result.user.roles).toEqual(['USER']);
    expect(mockJwtService.sign).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        sub: 'user-id-1',
      }),
      {
        secret: mockAppConfig.jwt.secret,
        expiresIn: mockAppConfig.jwt.expiration,
      },
    );
    expect(mockJwtService.sign).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        sub: 'user-id-1',
      }),
      {
        secret: mockAppConfig.jwt.refreshSecret,
        expiresIn: mockAppConfig.jwt.refreshExpiration,
      },
    );
    expect(mockAuthRepository.createRefreshToken).toHaveBeenCalled();
  });

  it('register creates local user with USER role', async () => {
    mockAuthRepository.findUserByEmailOrUsername.mockResolvedValue(null);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    mockAuthRepository.createUser.mockResolvedValue(mockUserWithRoles);

    const result = await service.register({
      email: 'new@example.com',
      username: 'newuser',
      password: 'password123',
      name: 'New User',
    });

    expect(result.roles).toEqual(['USER']);
    expect(mockAuthRepository.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'LOCAL',
        name: 'New User',
      }),
    );
  });

  it('register throws when user exists', async () => {
    mockAuthRepository.findUserByEmailOrUsername.mockResolvedValue(
      mockUserWithRoles,
    );
    await expect(
      service.register({
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
        name: 'Test User',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('googleLogin upserts Google user and returns login response', async () => {
    mockAuthRepository.upsertGoogleUser.mockResolvedValue(mockUserWithRoles);
    mockJwtService.sign
      .mockReturnValueOnce('access-token')
      .mockReturnValueOnce('refresh-token');
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-refresh-token');
    mockAuthRepository.createRefreshToken.mockResolvedValue(undefined);

    const result = await service.googleLogin({
      googleId: 'google-123',
      email: 'test@example.com',
      name: 'Test User',
      avatarUrl: null,
    });

    expect(result.accessToken).toBe('access-token');
    expect(mockAuthRepository.upsertGoogleUser).toHaveBeenCalledWith(
      expect.objectContaining({
        googleId: 'google-123',
      }),
    );
  });

  it('refreshAccessToken signs new access token with explicit secret and expiresIn', async () => {
    mockJwtService.verify.mockReturnValue({
      sub: 'user-id-1',
      email: 'test@example.com',
      username: 'testuser',
      roles: ['USER'],
    });
    mockAuthRepository.findRefreshTokensByUserId.mockResolvedValue([
      {
        id: 'token-id',
        token: 'hashed-refresh-token',
        userId: 'user-id-1',
        expiresAt: new Date(Date.now() + 60_000),
        createdAt: new Date(),
      },
    ]);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    mockAuthRepository.findUserByIdWithRoles.mockResolvedValue(
      mockUserWithRoles,
    );
    mockJwtService.sign.mockReturnValue('new-access-token');

    const result = await service.refreshAccessToken('refresh-token');

    expect(result).toEqual({ accessToken: 'new-access-token' });
    expect(mockJwtService.sign).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 'user-id-1',
      }),
      {
        secret: mockAppConfig.jwt.secret,
        expiresIn: mockAppConfig.jwt.expiration,
      },
    );
  });
});
