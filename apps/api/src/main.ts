import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';
import { loadEnv } from './config/env';

async function bootstrap() {
  try {
    process.loadEnvFile();
  } catch {
    // Không có .env: dùng biến môi trường của hệ thống
  }
  const env = loadEnv();
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  configureApp(app, env);
  await app.listen(env.PORT, '0.0.0.0');
  // Proxy phía trước (Caddy, hoặc Next khi phát triển) giữ kết nối keep-alive để dùng lại.
  // Node mặc định đóng kết nối rảnh sau 5 giây, nếu đóng đúng lúc proxy gửi yêu cầu mới sẽ gây ECONNRESET.
  const server = app.getHttpServer() as import('node:http').Server;
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;
}

void bootstrap();
