import { z } from 'zod';

/** Biến tùy chọn để trống (ví dụ `AI_BASE_URL=` trong .env hay Compose) được coi như chưa đặt */
const optional = <T extends z.ZodType>(schema: T) => z.preprocess((v) => (v === '' ? undefined : v), schema.optional());

/** Biến môi trường của API và worker, kiểm tra ngay lúc khởi động để báo lỗi sớm */
const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().default(4000),
    DATABASE_URL: z.string().min(1, 'Thiếu DATABASE_URL'),
    /** Thời hạn phiên đăng nhập, tính bằng giờ */
    SESSION_TTL_HOURS: z.coerce.number().positive().default(12),
    /** Đặt false khi chạy http://localhost lúc phát triển. Production luôn bật. */
    COOKIE_SECURE: z
      .enum(['true', 'false'])
      .default('true')
      .transform((v) => v === 'true'),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    /** Adapter dịch vụ AI và STT (docs/srs/07 mục 9) */
    AI_PROVIDER: z.enum(['mock', 'http']).default('mock'),
    /** Địa chỉ và khóa của dịch vụ AI thật. Chỉ nằm ở máy chủ, không trả về trình duyệt (FR-ADM-02, NFR-SEC-06). */
    AI_BASE_URL: optional(z.string().url()),
    AI_API_KEY: optional(z.string().min(1)),
    /** Dịch vụ STT, nếu chạy ở địa chỉ khác dịch vụ AI. Bỏ trống thì dùng AI_BASE_URL và AI_API_KEY. */
    STT_BASE_URL: optional(z.string().url()),
    STT_API_KEY: optional(z.string().min(1)),
  })
  .superRefine((env, ctx) => {
    if (env.AI_PROVIDER !== 'http') return;
    if (!env.AI_BASE_URL)
      ctx.addIssue({ code: 'custom', path: ['AI_BASE_URL'], message: 'Bắt buộc khi AI_PROVIDER=http' });
    if (!env.AI_API_KEY)
      ctx.addIssue({ code: 'custom', path: ['AI_API_KEY'], message: 'Bắt buộc khi AI_PROVIDER=http' });
  });

export type Env = z.infer<typeof envSchema>;

export const loadEnv = (source: NodeJS.ProcessEnv = process.env): Env => {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Cấu hình môi trường không hợp lệ: ${issues}`);
  }
  const env = parsed.data;
  // Không cho tắt cookie Secure ở production
  if (env.NODE_ENV === 'production') env.COOKIE_SECURE = true;
  return env;
};

export const ENV = Symbol('ENV');
