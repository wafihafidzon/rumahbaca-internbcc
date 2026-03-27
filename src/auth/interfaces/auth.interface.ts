import { User } from '@prisma/client';
import { Request } from 'express';
import type { UserWithRoles } from '../../common/types/user.types';
export type { UserWithRoles };

export type AuthUser = Pick<User, 'id' | 'email' | 'username'> & {
  roles: string[];
};

export interface JwtPayload {
  sub: string;
  email: string;
  username: string;
  roles: string[];
}

export interface GoogleAuthUser {
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface RequestWithUser extends Request {
  user: JwtPayload;
}

export interface RequestWithGoogleUser extends Request {
  user: GoogleAuthUser;
}

export interface RequestWithCookies extends Request {
  cookies: {
    refreshToken?: string;
    [key: string]: string | undefined;
  };
}
