import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ROLES } from '../auth/constants/acl.constant';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth-guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { JwtPayload } from '../auth/interfaces/auth.interface';
import { ReadingStreakResponseDto } from './dto/reading-streak-response.dto';
import { StreakCalendarQueryDto } from './dto/streak-calendar-query.dto';
import { StreakCalendarResponseDto } from './dto/streak-calendar-response.dto';
import { ReadingStreakService } from './reading-streak.service';

@ApiTags('reading-streak')
@Controller('reading-streak')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.USER, ROLES.MODERATOR, ROLES.ADMIN)
@ApiBearerAuth()
export class ReadingStreakController {
  constructor(private readonly readingStreakService: ReadingStreakService) {}

  @ApiOperation({
    summary: 'Get current reading streak state for current user',
  })
  @ApiResponse({ status: 200, type: ReadingStreakResponseDto })
  @Get('me')
  async getStreak(
    @CurrentUser() user: JwtPayload,
  ): Promise<ReadingStreakResponseDto | null> {
    return this.readingStreakService.getStreak(user.sub);
  }

  @ApiOperation({
    summary: 'Get reading streak calendar for current user (7 or 30 days)',
  })
  @ApiQuery({
    name: 'range',
    required: false,
    enum: [7, 30],
    description: 'Calendar range in days',
  })
  @ApiResponse({ status: 200, type: StreakCalendarResponseDto })
  @Get('me/calendar')
  async getCalendar(
    @CurrentUser() user: JwtPayload,
    @Query() query: StreakCalendarQueryDto,
  ): Promise<StreakCalendarResponseDto> {
    return this.readingStreakService.getCalendar(user.sub, query.range ?? 7);
  }
}
