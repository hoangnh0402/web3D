import { Inject, Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { PgBoss } from 'pg-boss';
import { ENV, type Env } from '../config/env';
import { RetentionService } from './retention.service';
import { SessionLifecycleService } from '../sessions/session-lifecycle.service';
import { AssessmentService } from '../assessment/assessment.service';
import { PrismaService } from '../prisma/prisma.service';
import { PGBOSS_SCHEMA, QUEUES } from '../queue/queues';

/** Báo cáo kẹt ở trạng thái đang xử lý quá lâu (worker bị dừng giữa chừng) thì đưa về hàng chờ */
const STUCK_MS = 10 * 60_000;

/** Hàng đợi pg-boss chạy trên chính PostgreSQL, schema riêng "pgboss", không cần Redis */
@Injectable()
export class QueueService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(QueueService.name);
  private readonly boss: PgBoss;

  constructor(
    @Inject(ENV) env: Env,
    private readonly retention: RetentionService,
    private readonly lifecycle: SessionLifecycleService,
    private readonly assessments: AssessmentService,
    private readonly prisma: PrismaService,
  ) {
    this.boss = new PgBoss({ connectionString: env.DATABASE_URL, schema: PGBOSS_SCHEMA });
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
    // Mỗi phút: kết thúc phiên quá giờ, chuyển phiên không hoạt động sang Bỏ dở (FR-SES-07, FR-SES-08)
    await this.boss.createQueue(QUEUES.SESSION_SWEEP);
    await this.boss.schedule(QUEUES.SESSION_SWEEP, '* * * * *');
    await this.boss.work(QUEUES.SESSION_SWEEP, async () => {
      const r = await this.lifecycle.sweep();
      if (r.ended || r.abandoned) this.logger.log(r, 'Đã cập nhật trạng thái phiên');
      await this.requeueAssessments();
    });
    // Tạo báo cáo sau phiên. Dịch vụ báo cáo tự thử lại nên hàng đợi không thử lại thêm.
    await this.boss.createQueue(QUEUES.ASSESSMENT, { retryLimit: 0 });
    await this.boss.work<{ sessionId: string }>(QUEUES.ASSESSMENT, async ([job]) => {
      if (!job) return;
      const status = await this.assessments.generate(job.data.sessionId);
      if (status) this.logger.log({ sessionId: job.data.sessionId, status }, 'Đã xử lý báo cáo');
    });
    this.logger.log('Worker đã sẵn sàng');
  }

  /** Xếp lại các báo cáo còn chờ, gồm cả phiên do worker tự kết thúc khi hết giờ */
  private async requeueAssessments() {
    await this.prisma.assessment.updateMany({
      where: { status: 'PROCESSING', updatedAt: { lt: new Date(Date.now() - STUCK_MS) } },
      data: { status: 'PENDING' },
    });
    const pending = await this.prisma.assessment.findMany({ where: { status: 'PENDING' }, select: { sessionId: true } });
    for (const { sessionId } of pending) {
      await this.boss.send(QUEUES.ASSESSMENT, { sessionId }, { singletonKey: sessionId });
    }
  }

  async onApplicationShutdown() {
    await this.boss.stop({ graceful: true });
  }
}
