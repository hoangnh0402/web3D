'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { UserPlus } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { PASSWORD_MIN_LENGTH, registerSchema, type RegisterInput } from '@lab-fourt/shared';
import { ApiRequestError } from '@/lib/api';
import { Field, Notice } from './ui';

const FIELDS: { name: keyof RegisterInput; label: string; auto: string; type?: string; hint?: string }[] = [
  { name: 'fullName', label: 'Họ và tên', auto: 'name' },
  {
    name: 'username',
    label: 'Tên đăng nhập',
    auto: 'username',
    hint: 'Chữ thường không dấu, số, dấu chấm. Ví dụ: an.nguyen',
  },
  { name: 'note', label: 'Lớp hoặc mã sinh viên', auto: 'off', hint: 'Để quản trị viên xác minh trước khi duyệt.' },
  {
    name: 'password',
    label: 'Mật khẩu',
    auto: 'new-password',
    type: 'password',
    hint: `Tối thiểu ${PASSWORD_MIN_LENGTH} ký tự, có cả chữ và số.`,
  },
  { name: 'confirmPassword', label: 'Nhập lại mật khẩu', auto: 'new-password', type: 'password' },
];

/** Biểu mẫu tự đăng ký tài khoản sinh viên, chờ quản trị viên duyệt (D-12) */
export const RegisterForm = ({
  onSubmit,
  pending,
  error,
}: {
  onSubmit: (values: RegisterInput) => void;
  pending: boolean;
  error?: unknown;
}) => {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', username: '', note: '', password: '', confirmPassword: '' },
  });

  // Lỗi từng trường do máy chủ trả về, ví dụ trùng tên đăng nhập
  useEffect(() => {
    if (error instanceof ApiRequestError && error.fields) {
      for (const [name, message] of Object.entries(error.fields)) setError(name as keyof RegisterInput, { message });
    }
  }, [error, setError]);

  const general =
    error instanceof ApiRequestError
      ? error.fields
        ? ''
        : error.message
      : error
        ? 'Chưa gửi được đăng ký, vui lòng thử lại'
        : '';

  return (
    <form className="stack" onSubmit={handleSubmit(onSubmit)} noValidate>
      <h2>Đăng ký tài khoản sinh viên</h2>
      {FIELDS.map((f) => (
        <Field key={f.name} id={`reg-${f.name}`} label={f.label} hint={f.hint} error={errors[f.name]?.message}>
          <input
            id={`reg-${f.name}`}
            className="input"
            type={f.type ?? 'text'}
            autoComplete={f.auto}
            aria-invalid={!!errors[f.name]}
            {...register(f.name)}
          />
        </Field>
      ))}
      {general && (
        <Notice tone="danger" icon={UserPlus}>
          {general}
        </Notice>
      )}
      <button type="submit" className="btn primary lg" disabled={pending} aria-busy={pending || undefined}>
        {pending ? 'Đang gửi...' : 'Gửi đăng ký'}
      </button>
    </form>
  );
};
