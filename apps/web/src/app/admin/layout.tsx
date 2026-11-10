'use client';

import type { ReactNode } from 'react';
import { Users } from 'lucide-react';
import { RoleShell, type NavItem } from '@/components/role-shell';

const NAV: NavItem[] = [{ href: '/admin', label: 'Tài khoản', icon: Users }];

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RoleShell roles={['ADMIN']} nav={NAV}>
      {children}
    </RoleShell>
  );
}
