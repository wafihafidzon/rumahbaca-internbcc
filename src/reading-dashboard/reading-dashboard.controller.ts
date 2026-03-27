import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ROLES } from '../auth/constants/acl.constant';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth-guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { JwtPayload } from '../auth/interfaces/auth.interface';
import { DashboardResponseDto } from './dto/dashboard-response.dto';
import { ReadingDashboardService } from './reading-dashboard.service';

@ApiTags('Reading Dashboard')
@Controller('reading-dashboard')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.USER, ROLES.MODERATOR, ROLES.ADMIN)
@ApiBearerAuth()
export class ReadingDashboardController {
  constructor(
    private readonly readingDashboardService: ReadingDashboardService,
  ) {}

  @ApiOperation({ summary: 'Get reading dashboard summary for current user' })
  @ApiResponse({ status: 200, type: DashboardResponseDto })
  @Get('me')
  async getMeDashboard(
    @CurrentUser() user: JwtPayload,
  ): Promise<DashboardResponseDto> {
    return this.readingDashboardService.getMeDashboard(user.sub);
  }
}
