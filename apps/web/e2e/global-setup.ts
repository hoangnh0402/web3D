import { execSync } from 'node:child_process';
import path from 'node:path';

/** Đặt lại tài khoản kiểm thử trước mỗi lần chạy để kịch bản đổi mật khẩu lần đầu luôn lặp lại được */
export default function globalSetup() {
  execSync('npx tsx test/e2e-user.ts', { cwd: path.resolve(__dirname, '../../api'), stdio: 'inherit' });
}
