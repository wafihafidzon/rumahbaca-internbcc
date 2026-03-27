import {
  Controller,
  UseGuards,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth-guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { FriendRequestService } from './friend-request.service';
import { CreateFriendRequestDto } from './dto/create-friend-request.dto';
import { FriendRequestQueryDto } from './dto/friend-request-query.dto';
import { RespondFriendRequestDto } from './dto/respond-friend-request.dto';
import type { JwtPayload } from '../auth/interfaces/auth.interface';
import { ROLES } from '../auth/constants/acl.constant';

@ApiTags('friend-requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('friend-requests')
export class FriendRequestController {
  constructor(private readonly service: FriendRequestService) {}

  @Post()
  @Roles(ROLES.USER, ROLES.ADMIN)
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateFriendRequestDto,
  ) {
    return this.service.create(user, dto);
  }

  @Get()
  @Roles(ROLES.USER, ROLES.ADMIN)
  async findByType(
    @CurrentUser() user: JwtPayload,
    @Query() query: FriendRequestQueryDto,
  ) {
    return this.service.findByType(user, query);
  }

  @Patch(':id/respond')
  @Roles(ROLES.USER, ROLES.ADMIN)
  async respond(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: RespondFriendRequestDto,
  ) {
    return this.service.respond(user, id, dto);
  }
}
