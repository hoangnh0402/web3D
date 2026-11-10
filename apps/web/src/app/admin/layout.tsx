'use client';

import type { ReactNode } from 'react';
import { Database, FileClock, School, Server, Settings2, Users } from 'lucide-react';
import { RoleShell, type NavItem } from '@/components/role-shell';

/** Trang quản trị dùng được mà không cần kiến thức kỹ thuật (FR-ADM-01) */
const NAV: NavItem[] = [
  { href: '/admin', label: 'Tài khoản', icon: Users },
  { href: '/admin/classes', label: 'Lớp', icon: School },
  { href: '/admin/data', label: 'Dữ liệu phiên', icon: Database },
  { href: '/admin/settings', label: 'Cấu hình', icon: Settings2 },
  { href: '/admin/status', label: 'Trạng thái hệ thống', icon: Server },
  { href: '/admin/audit', label: 'Nhật ký', icon: FileClock },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RoleShell roles={['ADMIN']} nav={NAV}>
      {children}
    </RoleShell>
  );
}
