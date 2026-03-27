import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ROLES } from '../auth/constants/acl.constant';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth-guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { JwtPayload } from '../auth/interfaces/auth.interface';
import { RespondInviteDto } from './dto/respond-invite.dto';
import { RoomInviteResponseDto } from './dto/room-invite-response.dto';
import { RoomInvitesService } from './room-invites.service';

@ApiTags('room-invites')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('room-invites')
export class RoomInvitesController {
  constructor(private readonly service: RoomInvitesService) {}

  @Get()
  @Roles(ROLES.USER, ROLES.ADMIN)
  @ApiOperation({ summary: "List current user's pending room invites" })
  @ApiResponse({ status: 200, type: [RoomInviteResponseDto] })
  async findPending(
    @CurrentUser() user: JwtPayload,
  ): Promise<RoomInviteResponseDto[]> {
    return this.service.findPending(user);
  }

  @Patch(':id/respond')
  @Roles(ROLES.USER, ROLES.ADMIN)
  @ApiOperation({ summary: 'Accept or reject a room invite' })
  @ApiParam({ name: 'id', description: 'Room invite ID' })
  @ApiResponse({ status: 200, type: RoomInviteResponseDto })
  @ApiResponse({ status: 403, description: 'Action not allowed for this user' })
  @ApiResponse({ status: 404, description: 'Room invite not found' })
  @ApiResponse({
    status: 409,
    description: 'Invite is no longer pending',
  })
  async respond(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: RespondInviteDto,
  ): Promise<RoomInviteResponseDto> {
    return this.service.respond(user, id, dto);
  }
}
