import { Inject, Injectable, Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { PgBoss } from 'pg-boss';
import { ENV, type Env } from '../config/env';
import { PGBOSS_SCHEMA, QUEUES, type AssessmentQueue } from './queues';

/**
 * Phía API chỉ gửi việc vào hàng đợi, không chạy bộ lập lịch hay bảo trì (việc của worker).
 * Gửi lỗi không làm hỏng thao tác của người dùng: worker quét lại các báo cáo còn chờ mỗi phút.
 */
@Injectable()
export class QueueClientService implements AssessmentQueue, OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(QueueClientService.name);
  private readonly boss: PgBoss;
  private ready?: Promise<void>;

  constructor(@Inject(ENV) env: Env) {
    this.boss = new PgBoss({ connectionString: env.DATABASE_URL, schema: PGBOSS_SCHEMA, supervise: false, schedule: false });
    this.boss.on('error', (err) => this.logger.error(err));
  }

  onModuleInit() {
    this.ready = this.boss
      .start()
      .then(() => this.boss.createQueue(QUEUES.ASSESSMENT))
      .catch((err: unknown) => {
        this.ready = undefined;
        this.logger.error({ err }, 'Không khởi động được hàng đợi');
      });
  }

  async enqueue(sessionId: string) {
    try {
      await this.ready;
      // singletonKey: một phiên chỉ có một việc tạo báo cáo đang chờ
      await this.boss.send(QUEUES.ASSESSMENT, { sessionId }, { singletonKey: sessionId });
    } catch (err) {
      this.logger.warn({ err, sessionId }, 'Chưa xếp được việc tạo báo cáo, worker sẽ quét lại');
    }
  }

  async onApplicationShutdown() {
    await this.boss.stop({ graceful: false }).catch(() => undefined);
  }
}
