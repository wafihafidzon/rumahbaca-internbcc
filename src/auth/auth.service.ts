import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { CustomLoggerService } from '../common/logger/logger.service';
import { RefreshToken } from '@prisma/client';
import ms from 'ms';
import { AppConfigService } from '../config/app-config.service';
import type {
  AuthUser,
  GoogleAuthUser,
  JwtPayload,
  LoginResponse,
} from './interfaces/auth.interface';
import { RegisterDto } from './dto/register.dto';
import { AuthRepository } from './auth.repository';
import { UserWithRoles, mapUserRoles } from '../common/types/user.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly logger: CustomLoggerService,
    private readonly appConfig: AppConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<UserWithRoles> {
    const user = await this.getUserWithRolesByEmail(email);

    if (!user) {
      this.logger.warn(
        `Login attempt with non-existent email: ${email}`,
        'Auth',
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      this.logger.warn(`Login attempt with inactive user: ${email}`, 'Auth');
      throw new UnauthorizedException('User account is inactive');
    }

    if (!user.password) {
      throw new UnauthorizedException(
        'This account uses Google sign in. Please use Google login.',
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      this.logger.warn(`Failed to login attempt for user: ${email}`, 'Auth');
      throw new UnauthorizedException('Invalid credentials');
    }

    this.logger.log(`User logged in: ${email}`, 'Auth');

    return user;
  }

  async getUserWithRolesByEmail(email: string): Promise<UserWithRoles | null> {
    const user = await this.authRepository.findUserByEmailWithRoles(email);
    if (!user) return null;
    return mapUserRoles(user);
  }

  async getUserWithRolesById(id: string): Promise<UserWithRoles | null> {
    const user = await this.authRepository.findUserByIdWithRoles(id);
    if (!user) return null;
    return mapUserRoles(user);
  }

  async login(user: AuthUser): Promise<LoginResponse> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      roles: user.roles,
    };

    const accessToken = this.jwtService.sign(payload);

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.appConfig.jwt.refreshSecret,
      expiresIn: this.appConfig.jwt.refreshExpiration,
    });

    // Store refresh token in database
    const expiresAt = new Date(
      Date.now() + ms(this.appConfig.jwt.refreshExpiration),
    );

    const hashedToken = await bcrypt.hash(refreshToken, 10);

    await this.authRepository.createRefreshToken(
      user.id,
      hashedToken,
      expiresAt,
    );

    return {
      accessToken,
      refreshToken,
      user,
    };
  }

  async refreshAccessToken(
    refreshTokenValue: string,
  ): Promise<{ accessToken: string }> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshTokenValue, {
        secret: this.appConfig.jwt.refreshSecret,
      });

      // Verify token exists in database
      const storedTokens = await this.authRepository.findRefreshTokensByUserId(
        payload.sub,
      );

      let matchedToken: RefreshToken | null = null;

      for (const tokenRecord of storedTokens) {
        const isMatch = await bcrypt.compare(
          refreshTokenValue,
          tokenRecord.token,
        );
        if (isMatch) {
          matchedToken = tokenRecord;
          break;
        }
      }

      if (!matchedToken || matchedToken.expiresAt < new Date()) {
        throw new UnauthorizedException('Refresh token expired or invalid');
      }

      const user = await this.getUserWithRolesById(payload.sub);

      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }

      const newPayload: JwtPayload = {
        sub: user.id,
        email: user.email,
        username: user.username,
        roles: user.roles,
      };

      const newAccessToken = this.jwtService.sign(newPayload);

      this.logger.debug(
        `Token refreshed successfully for: ${user.email}`,
        'Auth',
      );

      return {
        accessToken: newAccessToken,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Invalid refresh token`, errorMessage, 'Auth');
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string, email: string): Promise<void> {
    await this.authRepository.deleteRefreshTokensByUserId(userId);
    this.logger.log(`User logged out: ${email}`, 'Auth');
  }

  async register(data: RegisterDto): Promise<AuthUser> {
    const { email, password, username, name } = data;

    const existingUser = await this.authRepository.findUserByEmailOrUsername(
      email,
      username,
    );

    if (existingUser) {
      throw new BadRequestException(
        'User with this email or username already exists',
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.authRepository.createUser({
      email,
      username,
      name,
      password: hashedPassword,
      provider: 'LOCAL',
    });

    this.logger.log(`User registered: ${email}`, 'Auth');

    const mappedUser = mapUserRoles(user);

    return {
      id: mappedUser.id,
      email: mappedUser.email,
      username: mappedUser.username,
      roles: mappedUser.roles,
    };
  }

  async googleLogin(googleUser: GoogleAuthUser): Promise<LoginResponse> {
    const user = await this.authRepository.upsertGoogleUser(googleUser);
    const mappedUser = mapUserRoles(user);
    return this.login({
      id: mappedUser.id,
      email: mappedUser.email,
      username: mappedUser.username,
      roles: mappedUser.roles,
    });
  }
}
