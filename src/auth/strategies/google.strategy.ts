import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';
import { AppConfigService } from '../../config/app-config.service';
import { GoogleAuthUser } from '../interfaces/auth.interface';
import type { Request } from 'express';
import { randomBytes } from 'crypto';

const GOOGLE_OAUTH_STATE_COOKIE = 'google_oauth_state';

type StateStoreCallback = (err: Error | null, state?: string) => void;
type StateVerifyCallback = (
  err: Error | null,
  ok?: boolean,
  state?: string,
) => void;

class CookieStateStore {
  constructor(
    private readonly cookieName: string,
    private readonly secureCookie: boolean,
  ) {}

  store(req: Request, callback: StateStoreCallback): void;
  store(req: Request, _meta: unknown, callback: StateStoreCallback): void;
  store(
    req: Request,
    metaOrCallback: unknown,
    maybeCallback?: StateStoreCallback,
  ): void {
    const callback =
      typeof metaOrCallback === 'function'
        ? (metaOrCallback as StateStoreCallback)
        : maybeCallback;

    if (!callback) {
      return;
    }

    const state = randomBytes(16).toString('hex');
    req.res?.cookie(this.cookieName, state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.secureCookie,
      maxAge: 5 * 60 * 1000,
    });
    callback(null, state);
  }

  verify(
    req: Request,
    providedState: string,
    callback: StateVerifyCallback,
  ): void;
  verify(
    req: Request,
    providedState: string,
    _meta: unknown,
    callback: StateVerifyCallback,
  ): void;
  verify(
    req: Request,
    providedState: string,
    metaOrCallback: unknown,
    maybeCallback?: StateVerifyCallback,
  ): void {
    const callback =
      typeof metaOrCallback === 'function'
        ? (metaOrCallback as StateVerifyCallback)
        : maybeCallback;

    if (!callback) {
      return;
    }

    const expectedState = req.cookies?.[this.cookieName];
    req.res?.clearCookie(this.cookieName, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.secureCookie,
    });

    if (!expectedState || !providedState || expectedState !== providedState) {
      callback(null, false, providedState);
      return;
    }

    callback(null, true, providedState);
  }
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(appConfig: AppConfigService) {
    const stateStore = new CookieStateStore(
      GOOGLE_OAUTH_STATE_COOKIE,
      appConfig.env.cookieSecure,
    );

    super({
      clientID: appConfig.google.googleClientId,
      clientSecret: appConfig.google.googleClientSecret,
      callbackURL: appConfig.google.googleCallbackUrl,
      scope: ['email', 'profile'],
      state: true,
      store: stateStore as never,
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ): GoogleAuthUser {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      throw new UnauthorizedException('No email returned from Google');
    }

    return {
      googleId: profile.id,
      email,
      name: profile.displayName ?? profile.username ?? 'Google User',
      avatarUrl: profile.photos?.[0]?.value ?? null,
    };
  }
}
