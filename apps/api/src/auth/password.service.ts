import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

/** Tham số Argon2id theo khuyến nghị OWASP: 19 MiB bộ nhớ, 2 vòng */
const OPTIONS = { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

@Injectable()
export class PasswordService {
  /** Mã băm giả để thời gian phản hồi khi sai tên đăng nhập giống khi sai mật khẩu */
  private dummy?: Promise<string>;

  hash(password: string) {
    return argon2.hash(password, OPTIONS);
  }

  async verify(hash: string, password: string) {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }

  async burn(password: string) {
    this.dummy ??= this.hash('lab-fourt-dummy-password');
    await this.verify(await this.dummy, password);
  }
}
