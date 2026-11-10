import { describe, expect, it } from 'vitest';
import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('băm bằng Argon2id và xác minh đúng mật khẩu', async () => {
    const hash = await service.hash('MatKhau2026');
    expect(hash.startsWith('$argon2id$')).toBe(true);
    expect(await service.verify(hash, 'MatKhau2026')).toBe(true);
    expect(await service.verify(hash, 'matkhau2026')).toBe(false);
  });

  it('trả false thay vì ném lỗi khi mã băm hỏng', async () => {
    expect(await service.verify('khong-phai-ma-bam', 'x')).toBe(false);
  });
});
