import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import type { Env } from './config/env';

/** Cấu hình chung cho ứng dụng chạy thật và ứng dụng trong kiểm thử tích hợp */
export const configureApp = (app: INestApplication, env: Env) => {
  const express = app as NestExpressApplication;
  // Caddy đứng trước API, cần tin header X-Forwarded-For để lấy đúng IP người dùng
  express.set('trust proxy', 1);
  express.disable('x-powered-by');
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.enableShutdownHooks();

  if (env.NODE_ENV !== 'production') {
    const doc = new DocumentBuilder()
      .setTitle('Lab FourT API')
      .setDescription('API của Lab FourT. Mọi yêu cầu thay đổi dữ liệu cần header X-Requested-With: lab-fourt.')
      .setVersion('0.1.0')
      .addCookieAuth('lf_session')
      .build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, doc));
  }
  return app;
};
