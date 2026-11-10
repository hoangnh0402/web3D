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
}

void bootstrap();
