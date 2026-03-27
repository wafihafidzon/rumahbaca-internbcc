import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { AppService } from './app.service';
import { CacheKey, CacheTTL } from './common/cache/decorators/cache.decorator';
import { CustomCacheInterceptor } from './common/cache/interceptors/cache.interceptor';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('App')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @ApiOperation({ summary: 'Hello world / API root' })
  @ApiResponse({ status: 200, description: 'Returns greeting string' })
  @Get()
  @UseInterceptors(CustomCacheInterceptor)
  @CacheKey('hello_cache')
  @CacheTTL(30)
  // @Throttle({ default: { limit: 5, ttl: 60000 } })
  getHello(): string {
    return this.appService.getHello();
  }
}
