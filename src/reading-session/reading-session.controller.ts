import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
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
import { CreateReadingSessionDto } from './dto/create-reading-session.dto';
import { ReadingSessionQueryDto } from './dto/reading-session-query.dto';
import {
  ReadingSessionListResponseDto,
  ReadingSessionResponseDto,
} from './dto/reading-session-response.dto';
import { ReadingSessionService } from './reading-session.service';

@ApiTags('Reading Sessions')
@Controller('readings')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.USER, ROLES.MODERATOR, ROLES.ADMIN)
@ApiBearerAuth()
export class ReadingSessionController {
  constructor(private readonly readingSessionService: ReadingSessionService) {}

  @ApiOperation({ summary: 'Create a reading session for tracker' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 201, type: ReadingSessionResponseDto })
  @Post(':id/sessions')
  async create(
    @Param('id') id: string,
    @Body() dto: CreateReadingSessionDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ReadingSessionResponseDto> {
    return this.readingSessionService.create(id, user.sub, dto);
  }

  @ApiOperation({ summary: 'List reading sessions for tracker' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, type: ReadingSessionListResponseDto })
  @Get(':id/sessions')
  async findAll(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Query() query: ReadingSessionQueryDto,
  ): Promise<ReadingSessionListResponseDto> {
    return this.readingSessionService.findAll(id, user.sub, query);
  }
}
