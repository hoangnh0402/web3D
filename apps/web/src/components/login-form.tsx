'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { loginSchema, type LoginInput } from '@lab-fourt/shared';
import { ApiRequestError } from '@/lib/api';
import { Field, Notice } from './ui';

export const LoginForm = ({
  onSubmit,
  pending,
  error,
}: {
  onSubmit: (values: LoginInput) => void;
  pending: boolean;
  error?: unknown;
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { username: '', password: '' } });

  const message = error instanceof ApiRequestError ? error.message : error ? 'Đăng nhập không thành công, vui lòng thử lại' : '';

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
      {message && (
        <Notice tone="danger" icon={KeyRound}>
          {message}
        </Notice>
      )}
      <button type="submit" className="btn primary lg" disabled={pending} aria-busy={pending || undefined}>
        {pending ? 'Đang đăng nhập...' : 'Đăng nhập'}
      </button>
      <p className="small muted">Tài khoản do quản trị viên cấp. Quên mật khẩu, hãy liên hệ quản trị viên của bạn.</p>
    </form>
  );
};
