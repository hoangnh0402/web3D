'use client';

import type { ReactNode } from 'react';
import { BookOpen, Box, History, Home } from 'lucide-react';
import { RoleShell, type NavItem } from '@/components/role-shell';

const NAV: NavItem[] = [
  { href: '/student', label: 'Trang chủ', icon: Home },
  { href: '/student/cases', label: 'Thư viện ca', icon: BookOpen },
  { href: '/student/history', label: 'Lịch sử thực hành', icon: History },
  { href: '/student/room-preview', label: 'Xem thử phòng 3D', icon: Box },
];

export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <RoleShell roles={['STUDENT']} nav={NAV}>
      {children}
    </RoleShell>
  );
}
