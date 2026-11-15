'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ROLE_LOGIN, ROLES, type Role } from '@lab-fourt/shared';
import { AuthLayout } from './auth-layout';
import { LoginForm } from './login-form';
import { PORTAL } from './role-portals';
import { landingFor, useAuthOptions, useLogin, useMe } from '@/lib/auth';

/** Trang đăng nhập theo vai trò: /login (sinh viên), /login/giang-vien, /login/quan-tri */
export const LoginPortal = ({ portal }: { portal: Role }) => {
  const router = useRouter();
  const me = useMe();
  const login = useLogin();
  const options = useAuthOptions();
  const p = PORTAL[portal];

  // Đã đăng nhập thì chuyển thẳng về trang của mình
  useEffect(() => {
    if (me.data) router.replace(landingFor(me.data));
  }, [me.data, router]);

  return (
    <AuthLayout title={p.title} lead={p.lead}>
      <h2>{p.heading}</h2>
      <LoginForm
        portal={portal}
        onSubmit={(v) => login.mutate(v)}
        pending={login.isPending || login.isSuccess}
        error={login.error}
        options={options.data}
      />
      <div className="divider">Đăng nhập với vai trò khác</div>
      <nav className="role-quick" aria-label="Trang đăng nhập theo vai trò">
        {ROLES.filter((r) => r !== portal).map((r) => {
          const Icon = PORTAL[r].icon;
          return (
            <Link key={r} href={ROLE_LOGIN[r]}>
              <Icon size={19} aria-hidden />
              <div>
                <b>{PORTAL[r].card}</b>
                <span>{PORTAL[r].hint}</span>
              </div>
            </Link>
          );
        })}
      </nav>
    </AuthLayout>
  );
};
