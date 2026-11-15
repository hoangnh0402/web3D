'use client';

import { CheckCircle2, Clock } from 'lucide-react';
import Link from 'next/link';
import { AuthLayout } from '@/components/auth-layout';
import { RegisterForm } from '@/components/register-form';
import { Notice } from '@/components/ui';
import { useAuthOptions, useRegister } from '@/lib/auth';

/** Tự đăng ký tài khoản sinh viên. Tài khoản chỉ dùng được sau khi quản trị viên duyệt (D-12). */
export default function RegisterPage() {
  const options = useAuthOptions();
  const registerUser = useRegister();

  return (
    <AuthLayout
      title="Tham gia phòng thực hành"
      lead="Đăng ký tài khoản sinh viên. Quản trị viên sẽ xác minh và duyệt trước khi bạn bắt đầu thực hành."
    >
      {registerUser.isSuccess ? (
        <div className="stack">
          <Notice tone="neutral" icon={CheckCircle2}>
            Đã gửi đăng ký. Bạn đăng nhập được sau khi quản trị viên duyệt tài khoản.
          </Notice>
          <Link href="/login" className="btn primary lg">
            Về trang đăng nhập
          </Link>
        </div>
      ) : options.data && !options.data.registrationEnabled ? (
        <div className="stack">
          <Notice tone="warn" icon={Clock}>
            Hệ thống đang tạm dừng nhận đăng ký. Vui lòng liên hệ quản trị viên để được cấp tài khoản.
          </Notice>
          <Link href="/login" className="btn secondary">
            Về trang đăng nhập
          </Link>
        </div>
      ) : (
        <>
          <RegisterForm
            onSubmit={(v) => registerUser.mutate(v)}
            pending={registerUser.isPending}
            error={registerUser.error}
          />
          <p className="small muted">
            Đã có tài khoản? <Link href="/login">Đăng nhập</Link>
          </p>
        </>
      )}
    </AuthLayout>
  );
}
