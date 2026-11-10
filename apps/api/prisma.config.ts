import { defineConfig } from 'prisma/config';

// Prisma 7 không tự đọc .env. Node 24 có sẵn loadEnvFile nên không cần thêm thư viện.
try {
  process.loadEnvFile();
} catch {
  // Không có .env: dùng biến môi trường của hệ thống (Docker, CI)
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // prisma generate (lúc build image) không cần CSDL nên cho phép trống; migrate và seed sẽ báo lỗi nếu thiếu
    url: process.env.DATABASE_URL ?? '',
  },
});
