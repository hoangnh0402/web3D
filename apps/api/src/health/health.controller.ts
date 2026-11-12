import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../common/decorators';
import { PrismaService } from '../prisma/prisma.service';
import { AI_GATEWAY, type AiGateway } from '../ai-gateway/ai-gateway.types';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(AI_GATEWAY) private readonly ai: AiGateway,
  ) {}

  /** Dùng cho Docker và Uptime Kuma. Chỉ trả trạng thái, không lộ cấu hình. */
  @Public()
  @SkipThrottle()
  @Get()
  async check() {
    let database: 'ok' | 'error' = 'ok';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      database = 'error';
    }
    const [ai, stt] = await Promise.all(
      [this.ai.health(), this.ai.sttHealth()].map((p) =>
        p.then(
          (h) => h.status,
          () => 'error' as const,
        ),
      ),
    );
    const body = { status: database === 'ok' ? 'ok' : 'error', database, ai, stt };
    if (database !== 'ok') throw new ServiceUnavailableException(body);
    return body;
  }
}
