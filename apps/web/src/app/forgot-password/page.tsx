'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, KeyRound } from 'lucide-react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@lab-fourt/shared';
import { AuthLayout } from '@/components/auth-layout';
import { Field, Notice } from '@/components/ui';
import { ApiRequestError } from '@/lib/api';
import { useForgotPassword } from '@/lib/auth';

/**
 * Quên mật khẩu. Hệ thống chạy local, không có email (FR-AUTH-04), nên yêu cầu được gửi tới
 * quản trị viên. Quản trị viên xác minh rồi cấp mật khẩu tạm, người dùng đổi ở lần đăng nhập sau.
 */
export default function ForgotPasswordPage() {
  const send = useForgotPassword();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { username: '', note: '' },
  });

  const error =
    send.error instanceof ApiRequestError
      ? send.error.message
      : send.error
        ? 'Chưa gửi được yêu cầu, vui lòng thử lại'
        : '';

  return (
    <AuthLayout
      title="Quên mật khẩu"
      lead="Gửi yêu cầu cho quản trị viên. Bạn sẽ nhận mật khẩu tạm và đặt lại mật khẩu ở lần đăng nhập sau."
    >
      {send.isSuccess ? (
        <div className="stack">
          <Notice tone="neutral" icon={CheckCircle2}>
            Đã ghi nhận yêu cầu. Nếu tên đăng nhập đúng, quản trị viên sẽ cấp mật khẩu tạm cho bạn. Hãy liên hệ quản trị
            viên hoặc giảng viên để nhận mật khẩu tạm.
          </Notice>
          <Link href="/login" className="btn primary lg">
            Về trang đăng nhập
          </Link>
        </div>
      ) : (
        <form className="stack" onSubmit={handleSubmit((v) => send.mutate(v))} noValidate>
          <h2>Gửi yêu cầu đặt lại mật khẩu</h2>
          <Field id="fp-username" label="Tên đăng nhập" error={errors.username?.message}>
            <input
              id="fp-username"
              className="input"
              autoComplete="username"
              aria-invalid={!!errors.username}
              {...register('username')}
            />
          </Field>
          <Field
            id="fp-note"
            label="Ghi chú cho quản trị viên (không bắt buộc)"
            hint="Ví dụ lớp, mã sinh viên để quản trị viên xác minh."
            error={errors.note?.message}
          >
            <input id="fp-note" className="input" autoComplete="off" {...register('note')} />
          </Field>
          {error && (
            <Notice tone="danger" icon={KeyRound}>
              {error}
            </Notice>
          )}
          <button
            type="submit"
            className="btn primary lg"
            disabled={send.isPending}
            aria-busy={send.isPending || undefined}
          >
            {send.isPending ? 'Đang gửi...' : 'Gửi yêu cầu'}
          </button>
          <p className="small muted">
            Nhớ ra mật khẩu? <Link href="/login">Đăng nhập</Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
