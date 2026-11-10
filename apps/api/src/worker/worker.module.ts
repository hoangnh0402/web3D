import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { AuditModule } from '../audit/audit.module';
import { EnvModule } from '../config/config.module';
import { loadEnv } from '../config/env';
import { PrismaModule } from '../prisma/prisma.module';
import { SettingsModule } from '../settings/settings.module';
import { REDACT } from '../common/log';
import { RetentionService } from './retention.service';
import { QueueService } from './queue.service';
import { SessionLifecycleService } from '../sessions/session-lifecycle.service';
import { AiGatewayModule } from '../ai-gateway/ai-gateway.module';
import { AssessmentService } from '../assessment/assessment.service';

/** Worker chạy chung mã nguồn với API nhưng không mở cổng HTTP */
@Module({
  imports: [
    EnvModule,
    LoggerModule.forRootAsync({
      useFactory: () => ({ pinoHttp: { level: loadEnv().LOG_LEVEL, redact: { paths: REDACT, censor: '[đã ẩn]' } } }),
    }),
    PrismaModule,
    SettingsModule,
    AuditModule,
    AiGatewayModule,
  ],
  providers: [RetentionService, QueueService, SessionLifecycleService, AssessmentService],
})
export class WorkerModule {}
