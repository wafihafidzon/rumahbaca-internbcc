import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  Patch,
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
import { CreateReadingTrackerDto } from './dto/create-reading-tracker.dto';
import { ReadingTrackerQueryDto } from './dto/reading-tracker-query.dto';
import {
  ReadingTrackerListResponseDto,
  ReadingTrackerResponseDto,
} from './dto/reading-tracker-response.dto';
import { UpdateReadingTrackerDto } from './dto/update-reading-tracker.dto';
import { ReadingTrackerService } from './reading-tracker.service';

@ApiTags('Reading Trackers')
@Controller('readings')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.USER, ROLES.MODERATOR, ROLES.ADMIN)
@ApiBearerAuth()
export class ReadingTrackerController {
  constructor(private readonly readingTrackerService: ReadingTrackerService) {}

  @ApiOperation({ summary: 'Create a new reading tracker' })
  @ApiResponse({ status: 201, type: ReadingTrackerResponseDto })
  @Post()
  async create(
    @Body() dto: CreateReadingTrackerDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ReadingTrackerResponseDto> {
    return this.readingTrackerService.create(user.sub, dto);
  }

  @ApiOperation({ summary: 'List reading trackers for current user' })
  @ApiResponse({ status: 200, type: ReadingTrackerListResponseDto })
  @Get()
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: ReadingTrackerQueryDto,
  ): Promise<ReadingTrackerListResponseDto> {
    return this.readingTrackerService.findAll(user.sub, query);
  }

  @ApiOperation({ summary: 'Get reading tracker by ID for current user' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, type: ReadingTrackerResponseDto })
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<
    ReadingTrackerResponseDto & { goalSummary?: Record<string, unknown> }
  > {
    return this.readingTrackerService.findOne(id, user.sub);
  }

  @ApiOperation({ summary: 'Update reading tracker for current user' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, type: ReadingTrackerResponseDto })
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateReadingTrackerDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ReadingTrackerResponseDto> {
    return this.readingTrackerService.update(id, user.sub, dto);
  }
}
