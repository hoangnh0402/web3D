'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthLayout } from '@/components/auth-layout';
import { ChangePasswordForm } from '@/components/change-password-form';
import { useChangePassword, useMe } from '@/lib/auth';

export default function ChangePasswordPage() {
  const router = useRouter();
  const me = useMe();
  const change = useChangePassword();

  useEffect(() => {
    if (me.data === null) router.replace('/login');
  }, [me.data, router]);

  const first = me.data?.mustChangePassword ?? true;
  return (
    <AuthLayout
      title={first ? 'Chào mừng bạn đến với Lab FourT' : 'Đổi mật khẩu'}
      lead={
        first
          ? 'Đây là lần đăng nhập đầu tiên, hãy đặt mật khẩu của riêng bạn.'
          : 'Sau khi đổi, các thiết bị khác đang đăng nhập sẽ bị đăng xuất.'
      }
    >
      <ChangePasswordForm
        onSubmit={(v) => change.mutate(v)}
        pending={change.isPending || change.isSuccess}
        error={change.error}
      />
    </AuthLayout>
  );
}
