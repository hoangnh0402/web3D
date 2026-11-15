'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound } from 'lucide-react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { loginSchema, type AuthOptions, type LoginInput, type Role } from '@lab-fourt/shared';
import { ApiRequestError } from '@/lib/api';
import { Field, Notice } from './ui';

export const LoginForm = ({
  portal = 'STUDENT',
  onSubmit,
  pending,
  error,
  options,
}: {
  /** Trang đăng nhập của vai trò nào; máy chủ từ chối tài khoản khác vai trò */
  portal?: Role;
  onSubmit: (values: LoginInput) => void;
  pending: boolean;
  error?: unknown;
  /** Chưa tải xong thì ẩn liên kết đăng ký và dùng số ngày ghi nhớ mặc định */
  options?: AuthOptions;
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { username: '', password: '', remember: false, portal } });

  const message = error instanceof ApiRequestError ? error.message : error ? 'Đăng nhập không thành công, vui lòng thử lại' : '';
  const days = options?.rememberDays ?? 30;
  // Đăng nhập nhầm trang vai trò thì máy chủ trả đường dẫn tới đúng trang
  const rightPortal = error instanceof ApiRequestError && typeof error.data?.portal === 'string' ? error.data.portal : null;

  return (
    <form className="stack" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Field id="login-user" label="Tên đăng nhập" error={errors.username?.message}>
        <input
          id="login-user"
          className="input"
          autoComplete="username"
          aria-invalid={!!errors.username}
          aria-describedby={errors.username ? 'login-user-error' : undefined}
          {...register('username')}
        />
      </Field>
      <Field id="login-pass" label="Mật khẩu" error={errors.password?.message}>
        <input
          id="login-pass"
          className="input"
          type="password"
          autoComplete="current-password"
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? 'login-pass-error' : undefined}
          {...register('password')}
        />
      </Field>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <label className="check">
          <input id="login-remember" type="checkbox" aria-describedby="login-remember-hint" {...register('remember')} />
          <span>
            Ghi nhớ đăng nhập
            <span id="login-remember-hint" className="small muted" style={{ display: 'block' }}>
              Giữ đăng nhập {days} ngày. Không chọn khi dùng máy chung.
            </span>
          </span>
        </label>
        <Link href="/forgot-password" className="small">
          Quên mật khẩu?
        </Link>
      </div>
      {message && (
        <Notice tone="danger" icon={KeyRound}>
          {message}
          {rightPortal && (
            <>
              {' '}
              <Link href={rightPortal}>Đến trang đăng nhập đúng</Link>
            </>
          )}
        </Notice>
      )}
      <button type="submit" className="btn primary lg" disabled={pending} aria-busy={pending || undefined}>
        {pending ? 'Đang đăng nhập...' : 'Đăng nhập'}
      </button>
      {portal !== 'STUDENT' ? null : options?.registrationEnabled ? (
        <>
          <div className="divider">Chưa có tài khoản?</div>
          <Link href="/register" className="btn secondary">
            Đăng ký tài khoản sinh viên
          </Link>
        </>
      ) : (
        <p className="small muted">Tài khoản do quản trị viên cấp.</p>
      )}
    </form>
  );
};
