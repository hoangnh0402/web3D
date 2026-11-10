'use client';

import type { ReactNode } from 'react';
import { Box, Home } from 'lucide-react';
import { RoleShell, type NavItem } from '@/components/role-shell';

const NAV: NavItem[] = [
  { href: '/student', label: 'Trang chủ', icon: Home },
  { href: '/student/room-preview', label: 'Xem thử phòng 3D', icon: Box },
];

export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <RoleShell roles={['STUDENT']} nav={NAV}>
      {children}
    </RoleShell>
  );
}
