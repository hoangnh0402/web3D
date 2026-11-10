'use client';

import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import type {
  AdminClass,
  AdminSessionRow,
  AdminSettings,
  AdminUser,
  AuditRow,
  ClassInput,
  CreateUserInput,
  ImportResult,
  IssuedPassword,
  Page,
  RecordStatusInput,
  SystemSettings,
  SystemStatus,
  UpdateUserInput,
} from '@lab-fourt/shared';
import { api } from './api';

const qs = (params: Record<string, string | number | undefined>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : '';
};

/** Thao tác ghi xong thì tải lại danh sách liên quan */
const useAction = <I, O>(fn: (input: I) => Promise<O>, refresh: QueryKey) => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => void qc.invalidateQueries({ queryKey: refresh }) });
};

// ---------- Tài khoản ----------
export const useAdminUsers = (q: string) => useQuery({ queryKey: ['admin', 'users', q], queryFn: () => api<AdminUser[]>(`/admin/users${qs({ q })}`) });
export const useCreateUser = () => useAction((i: CreateUserInput) => api<IssuedPassword>('/admin/users', { method: 'POST', body: i }), ['admin', 'users']);
export const useUpdateUser = () =>
  useAction(({ id, ...body }: UpdateUserInput & { id: string }) => api<AdminUser>(`/admin/users/${id}`, { method: 'PATCH', body }), ['admin', 'users']);
export const useResetPassword = () =>
  useAction((id: string) => api<IssuedPassword>(`/admin/users/${id}/reset-password`, { method: 'POST' }), ['admin', 'users']);
export const useImportUsers = () => useAction((csv: string) => api<ImportResult>('/admin/users/import', { method: 'POST', body: { csv } }), ['admin', 'users']);

// ---------- Lớp ----------
export const useAdminClasses = () => useQuery({ queryKey: ['admin', 'classes'], queryFn: () => api<AdminClass[]>('/admin/classes') });
export const useSaveClass = () =>
  useAction(
    ({ id, ...body }: ClassInput & { id?: string }) =>
      api<{ id: string }>(id ? `/admin/classes/${id}` : '/admin/classes', { method: id ? 'PUT' : 'POST', body }),
    ['admin', 'classes'],
  );
export const useClassStatus = () =>
  useAction(
    ({ id, status }: { id: string; status: 'ACTIVE' | 'ARCHIVED' }) => api<void>(`/admin/classes/${id}/status`, { method: 'PATCH', body: { status } }),
    ['admin', 'classes'],
  );
export const useSetClassMembers = () =>
  useAction(
    ({ id, ...body }: { id: string; lecturerIds?: string[]; studentUsernames?: string[] }) =>
      api<{ missing: string[] }>(`/admin/classes/${id}/members`, { method: 'POST', body }),
    ['admin', 'classes'],
  );
export const useRemoveClassMember = () =>
  useAction(({ id, userId }: { id: string; userId: string }) => api<void>(`/admin/classes/${id}/members/${userId}`, { method: 'DELETE' }), [
    'admin',
    'classes',
  ]);

// ---------- Dữ liệu phiên ----------
export const useAdminSessions = (recordStatus: string, q: string) =>
  useQuery({ queryKey: ['admin', 'sessions', recordStatus, q], queryFn: () => api<AdminSessionRow[]>(`/admin/sessions${qs({ recordStatus, q })}`) });
export const useSetRecordStatus = () =>
  useAction(
    ({ id, ...body }: RecordStatusInput & { id: string }) => api<void>(`/admin/sessions/${id}/record-status`, { method: 'PATCH', body }),
    ['admin', 'sessions'],
  );
export const useRerunAssessment = () =>
  useAction((sessionId: string) => api<{ status: string }>(`/assessments/${sessionId}/rerun`, { method: 'POST' }), ['admin', 'sessions']);

// ---------- Cấu hình, trạng thái, nhật ký ----------
export const useAdminSettings = () => useQuery({ queryKey: ['admin', 'settings'], queryFn: () => api<AdminSettings>('/admin/settings') });
export const useSaveSettings = () =>
  useAction((patch: Partial<SystemSettings>) => api<AdminSettings>('/admin/settings', { method: 'PUT', body: patch }), ['admin', 'settings']);
export const useSystemStatus = () =>
  useQuery({ queryKey: ['admin', 'status'], queryFn: () => api<SystemStatus>('/admin/status'), refetchInterval: 30_000 });
export const useAuditLog = (filter: { action?: string; actor?: string; from?: string; to?: string; page: number }) =>
  useQuery({ queryKey: ['admin', 'audit', filter], queryFn: () => api<Page<AuditRow>>(`/admin/audit${qs(filter)}`) });
