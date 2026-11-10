'use client';

import type { ReactNode } from 'react';
import { BookOpen, CalendarPlus, LayoutGrid, Users } from 'lucide-react';
import { RoleShell, type NavItem } from '@/components/role-shell';

const NAV: NavItem[] = [
  { href: '/lecturer', label: 'Tổng quan', icon: LayoutGrid },
  { href: '/lecturer/cases', label: 'Ca mô phỏng', icon: BookOpen },
  { href: '/lecturer/assign', label: 'Giao bài', icon: CalendarPlus },
  { href: '/lecturer/classes', label: 'Lớp và thống kê', icon: Users },
];

export default function LecturerLayout({ children }: { children: ReactNode }) {
  return (
    <RoleShell roles={['LECTURER']} nav={NAV}>
      {children}
    </RoleShell>
  );
}
