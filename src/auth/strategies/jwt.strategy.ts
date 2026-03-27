import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppConfigService } from '../../config/app-config.service';
import type { JwtPayload } from '../interfaces/auth.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private appConfig: AppConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: appConfig.jwt.secret,
    });
  }

  validate(payload: JwtPayload): JwtPayload {
    if (
      !payload ||
      typeof payload.sub !== 'string' ||
      typeof payload.email !== 'string' ||
      typeof payload.username !== 'string' ||
      !Array.isArray(payload.roles) ||
      payload.roles.some((role) => typeof role !== 'string')
    ) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return payload;
  }
}
