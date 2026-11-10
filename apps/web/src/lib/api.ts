import type { ApiError } from '@lab-fourt/shared';

/** Header chống CSRF mà API yêu cầu ở mọi yêu cầu thay đổi dữ liệu */
const CSRF = { 'X-Requested-With': 'lab-fourt' };

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly fields?: Record<string, string>,
    /** Toàn bộ thân lỗi, ví dụ sessionId khi đã có phiên đang chạy */
    readonly data?: Record<string, unknown>,
  ) {
    super(message);
  }
}

/** Gọi API NestJS qua đường dẫn tương đối /api, dùng chung cookie phiên đăng nhập */
export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const form = init.body instanceof FormData;
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method: init.method ?? 'GET',
      credentials: 'same-origin',
      headers: { ...CSRF, ...(init.body !== undefined && !form ? { 'Content-Type': 'application/json' } : {}) },
      body: form ? (init.body as FormData) : init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiRequestError(0, 'Không kết nối được máy chủ. Hãy kiểm tra mạng rồi thử lại.');
  }
  if (res.status === 204) return undefined as T;
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const err = (data ?? {}) as Partial<ApiError> & Record<string, unknown>;
    throw new ApiRequestError(res.status, err.message ?? 'Đã có lỗi xảy ra, vui lòng thử lại', err.fields, err);
  }
  return data as T;
}
