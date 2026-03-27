import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AppConfigService } from '../config/app-config.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import type { Response } from 'express';

const mockUser = {
  id: 'user-id-1',
  email: 'test@example.com',
  username: 'testuser',
  roles: ['USER'],
};

const mockAuthService = {
  register: jest.fn(),
  validateUser: jest.fn(),
  login: jest.fn(),
  googleLogin: jest.fn(),
  refreshAccessToken: jest.fn(),
  logout: jest.fn(),
};

const mockAppConfig = {
  env: {
    cookieSecure: true,
  },
  jwt: {
    refreshExpiration: '7d',
  },
};

describe('AuthController', () => {
  let controller: AuthController;
  let authService: typeof mockAuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: AppConfigService, useValue: mockAppConfig },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
    jest.clearAllMocks();
  });

  it('register delegates to auth service', async () => {
    const registerDto: RegisterDto = {
      email: 'new@example.com',
      username: 'newuser',
      password: 'password123',
      name: 'New User',
    };

    authService.register.mockResolvedValue(mockUser);
    await controller.register(registerDto);

    expect(authService.register).toHaveBeenCalledWith(registerDto);
  });

  it('login validates user and sets refresh cookie', async () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'password123',
    };
    authService.validateUser.mockResolvedValue(mockUser);
    authService.login.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: mockUser,
    });

    const mockRes = { cookie: jest.fn() } as unknown as Response;
    const result = await controller.login(loginDto, mockRes);

    expect(authService.validateUser).toHaveBeenCalledWith(
      loginDto.email,
      loginDto.password,
    );
    expect(authService.login).toHaveBeenCalledWith(mockUser);
    expect(mockRes.cookie).toHaveBeenCalledWith(
      'refreshToken',
      'refresh-token',
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
      }),
    );
    expect(result).toHaveProperty('accessToken', 'access-token');
    expect(result.user).toEqual(expect.objectContaining(mockUser));
  });

  it('refresh throws when cookie is missing', async () => {
    await expect(controller.refresh({ cookies: {} } as any)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('refresh delegates to auth service', async () => {
    authService.refreshAccessToken.mockResolvedValue({
      accessToken: 'new-token',
    });

    const result = await controller.refresh({
      cookies: { refreshToken: 'refresh-token' },
    } as any);

    expect(result).toEqual({ accessToken: 'new-token' });
    expect(authService.refreshAccessToken).toHaveBeenCalledWith(
      'refresh-token',
    );
  });
});
