'use client';

import type { ReactNode } from 'react';
import { LayoutGrid } from 'lucide-react';
import { RoleShell, type NavItem } from '@/components/role-shell';

const NAV: NavItem[] = [{ href: '/lecturer', label: 'Tổng quan', icon: LayoutGrid }];

export default function LecturerLayout({ children }: { children: ReactNode }) {
  return (
    <RoleShell roles={['LECTURER']} nav={NAV}>
      {children}
    </RoleShell>
  );
}
