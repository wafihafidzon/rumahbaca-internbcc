import { Controller, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth-guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { FriendRequestService } from './friend-request.service';

@ApiTags('friend-requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('friend-requests')
export class FriendRequestController {
  constructor(private readonly service: FriendRequestService) {}
}
