import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';

/** Đưa mọi lỗi về một dạng thống nhất { statusCode, message, fields? } và không lộ chi tiết lỗi máy chủ */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpException');

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'object' && body && 'fields' in body) {
        res.status(status).json(body);
        return;
      }
      const message =
        typeof body === 'string' ? body : ((body as { message?: string | string[] }).message ?? exception.message);
      res.status(status).json({ statusCode: status, message: Array.isArray(message) ? message.join('; ') : message });
      return;
    }
    this.logger.error(exception);
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ statusCode: 500, message: 'Hệ thống đang gặp sự cố, vui lòng thử lại sau' });
  }
}
