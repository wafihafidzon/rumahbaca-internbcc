import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth-guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ROLES } from '../auth/constants/acl.constant';
import type { JwtPayload } from '../auth/interfaces/auth.interface';
import { FriendsService } from './friends.service';
import { FriendsQueryDto } from './dto/friends-query.dto';

@ApiTags('friends')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('friends')
export class FriendsController {
  constructor(private readonly service: FriendsService) {}

  @Get()
  @Roles(ROLES.USER, ROLES.ADMIN)
  @ApiOperation({ summary: 'List friends' })
  async findAll(
    @Query() query: FriendsQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.findAll(user.sub, query);
  }

  @Delete(':friendId')
  @Roles(ROLES.USER, ROLES.ADMIN)
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove a friend' })
  async remove(
    @Param('friendId') friendId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.service.remove(user.sub, friendId);
  }
}
