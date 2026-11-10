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
  /** Hướng dẫn hiển thị khi có tín hiệu nguy cơ (FR-SAFE-02). Nội dung minh họa, chờ giảng viên xác nhận (OI-03). */
  'safety.guidance':
    'Thân chủ vừa nói điều có thể liên quan đến nguy cơ. Hãy tạm dừng khám phá vấn đề, hỏi trực tiếp về sự an toàn của thân chủ và làm theo quy trình của giảng viên. Nếu chính bạn đang gặp khó khăn, hãy liên hệ giảng viên hoặc một người bạn tin cậy.',
} as const;

export type SettingKey = keyof typeof DEFAULT_SETTINGS;
type NumberKey = { [K in SettingKey]: (typeof DEFAULT_SETTINGS)[K] extends number ? K : never }[SettingKey];
type StringKey = { [K in SettingKey]: (typeof DEFAULT_SETTINGS)[K] extends string ? K : never }[SettingKey];

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getNumber(key: NumberKey): Promise<number> {
    const row = await this.prisma.systemSetting.findUnique({ where: { key } });
    return typeof row?.value === 'number' ? row.value : DEFAULT_SETTINGS[key];
  }

  async getString(key: StringKey): Promise<string> {
    const row = await this.prisma.systemSetting.findUnique({ where: { key } });
    return typeof row?.value === 'string' ? row.value : DEFAULT_SETTINGS[key];
  }
}
