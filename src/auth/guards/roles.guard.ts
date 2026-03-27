import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CustomLoggerService } from '../../common/logger/logger.service';
import { RequestWithUser } from '../interfaces/auth.interface';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { ROLES } from '../constants/acl.constant';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private logger: CustomLoggerService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      this.logger.error('User not found in request', '', 'RolesGuard');
      throw new ForbiddenException('User not found');
    }

    if (user.roles?.includes(ROLES.ADMIN)) {
      return true;
    }

    const hasRequiredRole = requiredRoles.some((role) =>
      user.roles?.includes(role),
    );

    if (!hasRequiredRole) {
      this.logger.warn(
        `Access denied for ${user.email}; required roles: [${requiredRoles.join(
          ', ',
        )}], current roles: [${user.roles?.join(', ') ?? ''}]`,
        'RolesGuard',
      );
      throw new ForbiddenException(
        `You do not have required role [${requiredRoles.join(', ')}]`,
      );
    }

    return true;
  }
}
