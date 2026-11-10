import type { Request } from 'express';
import type { Role } from '@lab-fourt/shared';

export interface SessionUser {
  id: string;
  username: string;
  fullName: string;
  role: Role;
  mustChangePassword: boolean;
  sessionId: string;
}

export interface AuthedRequest extends Request {
  user?: SessionUser;
}

export const SESSION_COOKIE = 'lf_session';

/** Địa chỉ IP của người gọi. Caddy đặt X-Forwarded-For, Express đọc nhờ trust proxy. */
export const clientIp = (req: Request) => req.ip ?? null;
