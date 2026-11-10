'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ReflectionDto, ReflectionInput, ReportDto } from '@lab-fourt/shared';
import { api } from './api';

/** Báo cáo tạo ở nền: hỏi lại mỗi 3 giây khi còn đang xử lý, rời trang không mất báo cáo (FR-RPT-01) */
export const useReport = (sessionId: string, enabled = true) =>
  useQuery({
    queryKey: ['reports', sessionId],
    queryFn: () => api<ReportDto>(`/sessions/${sessionId}/report`),
    enabled: enabled && !!sessionId,
    refetchInterval: (q) => (q.state.data && (q.state.data.status === 'PENDING' || q.state.data.status === 'PROCESSING') ? 3000 : false),
  });

export const useReflection = (sessionId: string) =>
  useQuery({ queryKey: ['reflections', sessionId], queryFn: () => api<ReflectionDto>(`/sessions/${sessionId}/reflection`) });

export const useSaveReflection = (sessionId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ReflectionInput) => api<ReflectionDto>(`/sessions/${sessionId}/reflection`, { method: 'PUT', body: input }),
    onSuccess: (data) => qc.setQueryData(['reflections', sessionId], data),
  });
};
