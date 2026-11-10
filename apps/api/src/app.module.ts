import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { AiGatewayModule } from './ai-gateway/ai-gateway.module';
import { AuditModule } from './audit/audit.module';
import { AuthGuard } from './auth/auth.guard';
import { AuthModule } from './auth/auth.module';
import { RolesGuard } from './auth/roles.guard';
import { CsrfGuard } from './common/csrf.guard';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { EnvModule } from './config/config.module';
import { loadEnv } from './config/env';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { SettingsModule } from './settings/settings.module';
import { UsersModule } from './users/users.module';
import { REDACT } from './common/log';

@Module({
  imports: [
    EnvModule,
    LoggerModule.forRootAsync({
      useFactory: () => {
        const env = loadEnv();
        return {
          pinoHttp: {
            level: env.LOG_LEVEL,
            redact: { paths: REDACT, censor: '[đã ẩn]' },
            // Không ghi log cho kiểm tra sức khỏe định kỳ
            autoLogging: { ignore: (req) => req.url?.startsWith('/api/health') ?? false },
          },
        };
      },
    }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 300 }]),
    PrismaModule,
    SettingsModule,
    AuditModule,
    AiGatewayModule,
    AuthModule,
    UsersModule,
    HealthModule,
  ],
  providers: [
    // Thứ tự chạy: giới hạn tần suất, chống CSRF, đăng nhập, vai trò
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
