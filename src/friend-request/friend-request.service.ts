import { Injectable } from '@nestjs/common';
import { CustomLoggerService } from '../common/logger/logger.service';
import { FriendRequestRepository } from './friend-request.repository';

@Injectable()
export class FriendRequestService {
  constructor(
    private readonly repo: FriendRequestRepository,
    private readonly logger: CustomLoggerService,
  ) {}
}
