import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
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
import { CreateRoomDto } from './dto/create-room.dto';
import { RoomQueryDto } from './dto/room-query.dto';
import {
  RoomDetailDto,
  RoomListResponseDto,
  RoomSummaryDto,
} from './dto/room-response.dto';
import { RoomsService } from './rooms.service';

@ApiTags('rooms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('rooms')
export class RoomsController {
  constructor(private readonly service: RoomsService) {}

  @Post()
  @Roles(ROLES.USER, ROLES.ADMIN)
  @ApiOperation({ summary: 'Create room' })
  @ApiResponse({ status: 201, type: RoomSummaryDto })
  @ApiResponse({ status: 404, description: 'Book not found' })
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateRoomDto,
  ): Promise<RoomSummaryDto> {
    return this.service.create(user, dto);
  }

  @Get()
  @Roles(ROLES.USER, ROLES.ADMIN)
  @ApiOperation({ summary: "List current user's rooms" })
  @ApiResponse({ status: 200, type: RoomListResponseDto })
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: RoomQueryDto,
  ): Promise<RoomListResponseDto> {
    return this.service.findAll(user, query);
  }

  @Get(':id')
  @Roles(ROLES.USER, ROLES.ADMIN)
  @ApiOperation({ summary: 'Get room detail (members only)' })
  @ApiParam({ name: 'id', description: 'Room ID' })
  @ApiResponse({ status: 200, type: RoomDetailDto })
  @ApiResponse({ status: 403, description: 'Not a room member' })
  async findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<RoomDetailDto> {
    return this.service.findOne(user, id);
  }
}
