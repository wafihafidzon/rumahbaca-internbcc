import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';
import { AppConfigService } from '../../config/app-config.service';
import { GoogleAuthUser } from '../interfaces/auth.interface';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(appConfig: AppConfigService) {
    super({
      clientID: appConfig.google.googleClientId,
      clientSecret: appConfig.google.googleClientSecret,
      callbackURL: appConfig.google.googleCallbackUrl,
      scope: ['email', 'profile'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ): GoogleAuthUser {
    return {
      googleId: profile.id,
      email: profile.emails?.[0]?.value ?? '',
      name: profile.displayName ?? profile.username ?? 'Google User',
      avatarUrl: profile.photos?.[0]?.value ?? null,
    };
  }
}
