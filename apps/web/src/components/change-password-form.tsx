'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { changePasswordSchema, PASSWORD_MIN_LENGTH, type ChangePasswordInput } from '@lab-fourt/shared';
import { ApiRequestError } from '@/lib/api';
import { Field, Notice } from './ui';

const FIELDS: { name: keyof ChangePasswordInput; label: string; auto: string; hint?: string }[] = [
  { name: 'currentPassword', label: 'Mật khẩu hiện tại', auto: 'current-password' },
  {
    name: 'newPassword',
    label: 'Mật khẩu mới',
    auto: 'new-password',
    hint: `Tối thiểu ${PASSWORD_MIN_LENGTH} ký tự, có cả chữ và số.`,
  },
  { name: 'confirmPassword', label: 'Nhập lại mật khẩu mới', auto: 'new-password' },
];

export const ChangePasswordForm = ({
  onSubmit,
  pending,
  error,
}: {
  onSubmit: (values: ChangePasswordInput) => void;
  pending: boolean;
  error?: unknown;
}) => {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  // Lỗi từng trường do máy chủ trả về, ví dụ sai mật khẩu hiện tại
  useEffect(() => {
    if (error instanceof ApiRequestError && error.fields) {
      for (const [name, message] of Object.entries(error.fields)) {
        setError(name as keyof ChangePasswordInput, { message });
      }
    }
  }, [error, setError]);

  const general = error instanceof ApiRequestError && !error.fields ? error.message : '';

  return (
    <form className="stack" onSubmit={handleSubmit(onSubmit)} noValidate>
      <h2>Đặt mật khẩu mới</h2>
      {FIELDS.map((f) => (
        <Field key={f.name} id={`pw-${f.name}`} label={f.label} hint={f.hint} error={errors[f.name]?.message}>
          <input
            id={`pw-${f.name}`}
            className="input"
            type="password"
            autoComplete={f.auto}
            aria-invalid={!!errors[f.name]}
            {...register(f.name)}
          />
        </Field>
      ))}
      {general && (
        <Notice tone="danger" icon={KeyRound}>
          {general}
        </Notice>
      )}
      <button type="submit" className="btn primary lg" disabled={pending} aria-busy={pending || undefined}>
        {pending ? 'Đang lưu...' : 'Lưu và tiếp tục'}
      </button>
    </form>
  );
};
