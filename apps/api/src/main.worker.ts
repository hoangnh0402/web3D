import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { loadEnv } from './config/env';
import { WorkerModule } from './worker/worker.module';

async function bootstrap() {
  try {
    process.loadEnvFile();
  } catch {
    // Không có .env: dùng biến môi trường của hệ thống
  }
  loadEnv();
  const app = await NestFactory.createApplicationContext(WorkerModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();
}

void bootstrap();
