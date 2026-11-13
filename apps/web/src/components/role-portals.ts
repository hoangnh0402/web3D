import { GraduationCap, Settings2, Users, type LucideIcon } from 'lucide-react';
import type { Role } from '@lab-fourt/shared';

/** Nội dung riêng của trang đăng nhập từng vai trò; thẻ chọn vai trò lấy theo prototype (role-quick) */
export const PORTAL: Record<
  Role,
  { title: string; lead: string; heading: string; icon: LucideIcon; card: string; hint: string }
> = {
  STUDENT: {
    title: 'Một căn phòng để luyện lắng nghe',
    lead: 'Thực hành tham vấn với thân chủ mô phỏng, xem lại từng lượt trao đổi và nhận phản hồi có dẫn chứng.',
    heading: 'Đăng nhập sinh viên',
    icon: GraduationCap,
    card: 'Sinh viên',
    hint: 'Thực hành ca và xem báo cáo',
  },
  LECTURER: {
    title: 'Đồng hành cùng sinh viên',
    lead: 'Soạn ca, giao bài và theo dõi tiến bộ của sinh viên trong lớp bạn phụ trách.',
    heading: 'Đăng nhập giảng viên',
    icon: Users,
    card: 'Giảng viên',
    hint: 'Soạn ca, giao bài, nhận xét',
  },
  ADMIN: {
    title: 'Quản trị hệ thống',
    lead: 'Quản lý tài khoản, lớp, dữ liệu phiên và cấu hình của Lab FourT.',
    heading: 'Đăng nhập quản trị',
    icon: Settings2,
    card: 'Quản trị viên',
    hint: 'Tài khoản, dữ liệu, hệ thống',
  },
};
