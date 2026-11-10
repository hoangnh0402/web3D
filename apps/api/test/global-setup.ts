import { execSync } from 'node:child_process';
import { Client } from 'pg';

/** Tạo lại CSDL kiểm thử và áp dụng migration trước khi chạy các bài kiểm thử tích hợp */
export default async function setup() {
  try {
    process.loadEnvFile();
  } catch {
    // Không có .env
  }
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    console.warn('Không có TEST_DATABASE_URL: bỏ qua kiểm thử tích hợp');
    return;
  }
  const target = new URL(url);
  const name = target.pathname.slice(1);
  if (!/^[a-z0-9_]+_test$/.test(name)) throw new Error('Tên CSDL kiểm thử phải kết thúc bằng _test để tránh xóa nhầm dữ liệu');
  const admin = new URL(url);
  admin.pathname = '/postgres';
  const client = new Client({ connectionString: admin.toString() });
  await client.connect();
  await client.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
  await client.query(`CREATE DATABASE "${name}"`);
  await client.end();
  execSync('npx prisma migrate deploy', { stdio: 'pipe', env: { ...process.env, DATABASE_URL: url } });
}
