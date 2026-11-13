'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  ROLE_HOME,
  ROLE_LOGIN,
  type AuthOptions,
  type ChangePasswordInput,
  type CurrentUser,
  type ForgotPasswordInput,
  type LoginInput,
  type RegisterInput,
} from '@lab-fourt/shared';
import { api, ApiRequestError } from './api';

export const ME_KEY = ['auth', 'me'] as const;

/** Người dùng hiện tại. null khi chưa đăng nhập. */
export const useMe = () =>
  useQuery({
    queryKey: ME_KEY,
    queryFn: async () => {
      try {
        return await api<CurrentUser>('/auth/me');
      } catch (err) {
        if (err instanceof ApiRequestError && err.status === 401) return null;
        throw err;
      }
    },
    staleTime: 60_000,
    retry: false,
  });

/** Trang đích sau khi đăng nhập hoặc đổi mật khẩu */
export const landingFor = (user: CurrentUser) => (user.mustChangePassword ? '/change-password' : ROLE_HOME[user.role]);

export const useLogin = () => {
  const qc = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: (input: LoginInput) => api<CurrentUser>('/auth/login', { method: 'POST', body: input }),
    onSuccess: (user) => {
      qc.setQueryData(ME_KEY, user);
      router.replace(landingFor(user));
    },
  });
};

/** Có mở đăng ký không và số ngày ghi nhớ đăng nhập, để trang đăng nhập hiển thị đúng */
export const useAuthOptions = () =>
  useQuery({ queryKey: ['auth', 'options'], queryFn: () => api<AuthOptions>('/auth/options'), staleTime: 60_000 });

/** Tự đăng ký, tài khoản chờ quản trị viên duyệt (D-12) */
export const useRegister = () =>
  useMutation({ mutationFn: (input: RegisterInput) => api<{ status: 'PENDING' }>('/auth/register', { method: 'POST', body: input }) });

/** Gửi yêu cầu đặt lại mật khẩu cho quản trị viên */
export const useForgotPassword = () =>
  useMutation({
    mutationFn: (input: ForgotPasswordInput) => api<{ accepted: true }>('/auth/forgot-password', { method: 'POST', body: input }),
  });

export const useChangePassword = () => {
  const qc = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: (input: ChangePasswordInput) => api<CurrentUser>('/auth/change-password', { method: 'POST', body: input }),
    onSuccess: (user) => {
      qc.setQueryData(ME_KEY, user);
      router.replace(landingFor(user));
    },
  });
};

export const useLogout = () => {
  const qc = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: () => api<void>('/auth/logout', { method: 'POST' }),
    onSettled: () => {
      // Đăng xuất thì về trang đăng nhập của đúng vai trò vừa dùng
      const role = qc.getQueryData<CurrentUser | null>(ME_KEY)?.role;
      qc.clear();
      router.replace(role ? ROLE_LOGIN[role] : '/login');
    },
  });
};
