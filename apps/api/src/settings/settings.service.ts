import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Tham số hệ thống mặc định, được seed vào bảng system_settings và quản trị viên sửa được (FR-ADM-06) */
export const DEFAULT_SETTINGS = {
  /** Số lần nhập sai liên tiếp trước khi khóa tạm (FR-AUTH-06) */
  'auth.maxFailedLogins': 5,
  /** Thời gian khóa tạm, tính bằng phút */
  'auth.lockMinutes': 15,
  /** Thời hạn lưu phiên trước khi chuyển sang Đã lưu trữ (D-04) */
  'retention.days': 14,
  /** Độ dài phiên mặc định, tính bằng phút */
  'session.defaultDurationMin': 30,
  /** Không hoạt động quá thời gian này thì phiên chuyển sang Bỏ dở */
  'session.idleTimeoutMin': 20,
} as const;

export type SettingKey = keyof typeof DEFAULT_SETTINGS;

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getNumber(key: SettingKey): Promise<number> {
    const row = await this.prisma.systemSetting.findUnique({ where: { key } });
    return typeof row?.value === 'number' ? row.value : DEFAULT_SETTINGS[key];
  }
}
