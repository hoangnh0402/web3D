import { Inject, Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { PgBoss } from 'pg-boss';
import { ENV, type Env } from '../config/env';
import { RetentionService } from './retention.service';

/** Tên hàng đợi. Báo cáo sau phiên sẽ thêm ở nhiệm vụ sau. */
export const QUEUES = {
  RETENTION: 'retention-archive',
} as const;

/** Hàng đợi pg-boss chạy trên chính PostgreSQL, schema riêng "pgboss", không cần Redis */
@Injectable()
export class QueueService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(QueueService.name);
  private readonly boss: PgBoss;

  constructor(
    @Inject(ENV) env: Env,
    private readonly retention: RetentionService,
  ) {
    this.boss = new PgBoss({ connectionString: env.DATABASE_URL, schema: 'pgboss' });
    this.boss.on('error', (err) => this.logger.error(err));
  }

  async onApplicationBootstrap() {
    await this.boss.start();
    await this.boss.createQueue(QUEUES.RETENTION);
    // 02:00 hằng ngày theo giờ Việt Nam
    await this.boss.schedule(QUEUES.RETENTION, '0 2 * * *', null, { tz: 'Asia/Ho_Chi_Minh' });
    await this.boss.work(QUEUES.RETENTION, async () => {
      await this.retention.archiveExpired();
    });
    this.logger.log('Worker đã sẵn sàng');
  }

  async onApplicationShutdown() {
    await this.boss.stop({ graceful: true });
  }
}
