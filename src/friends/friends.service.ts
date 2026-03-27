import { Injectable } from '@nestjs/common';
import { CustomLoggerService } from '../common/logger/logger.service';
import { FriendsRepository } from './friends.repository';

@Injectable()
export class FriendsService {
  constructor(
    private readonly repo: FriendsRepository,
    private readonly logger: CustomLoggerService,
  ) {}
}
