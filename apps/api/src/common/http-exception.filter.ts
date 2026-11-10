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
      // Giữ các trường bổ sung như fields (lỗi từng trường) hay sessionId (phiên đang chạy), bỏ trường error tiếng Anh
      if (typeof body === 'object' && body && ('fields' in body || 'sessionId' in body)) {
        const { error: _error, ...rest } = body as Record<string, unknown>;
        res.status(status).json({ ...rest, statusCode: status });
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
