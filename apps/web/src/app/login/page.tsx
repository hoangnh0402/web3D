'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthLayout } from '@/components/auth-layout';
import { LoginForm } from '@/components/login-form';
import { landingFor, useLogin, useMe } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const me = useMe();
  const login = useLogin();

  // Đã đăng nhập thì chuyển thẳng về trang của mình
  useEffect(() => {
    if (me.data) router.replace(landingFor(me.data));
  }, [me.data, router]);

  return (
    <AuthLayout
      title="Một căn phòng để luyện lắng nghe"
      lead="Thực hành tham vấn với thân chủ mô phỏng, xem lại từng lượt trao đổi và nhận phản hồi có dẫn chứng."
    >
      <LoginForm onSubmit={(v) => login.mutate(v)} pending={login.isPending || login.isSuccess} error={login.error} />
    </AuthLayout>
  );
}
