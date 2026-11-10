'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AuthoringCase, AuthoringCaseRow, CaseEditorInput } from '@lab-fourt/shared';
import { api } from './api';

export const useAuthoringCases = () =>
  useQuery({ queryKey: ['lecturer', 'cases'], queryFn: () => api<AuthoringCaseRow[]>('/lecturer/cases') });

export const useAuthoringCase = (id: string) =>
  useQuery({ queryKey: ['lecturer', 'cases', id], queryFn: () => api<AuthoringCase>(`/lecturer/cases/${id}`) });

/** Mọi thao tác soạn ca đều trả về trạng thái mới nhất của ca */
const useCaseAction = <T,>(fn: (input: T) => Promise<AuthoringCase>) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (data) => {
      qc.setQueryData(['lecturer', 'cases', data.id], data);
      void qc.invalidateQueries({ queryKey: ['lecturer', 'cases'], exact: true });
      void qc.invalidateQueries({ queryKey: ['cases'] });
    },
  });
};

export const useCreateCase = () => useCaseAction((data: CaseEditorInput) => api<AuthoringCase>('/lecturer/cases', { method: 'POST', body: data }));

export const useSaveCase = (id: string) =>
  useCaseAction((data: CaseEditorInput) => api<AuthoringCase>(`/lecturer/cases/${id}`, { method: 'PUT', body: data }));

export const usePublishCase = (id: string) => useCaseAction(() => api<AuthoringCase>(`/lecturer/cases/${id}/publish`, { method: 'POST' }));

export const useCopyCase = () => useCaseAction((id: string) => api<AuthoringCase>(`/lecturer/cases/${id}/copy`, { method: 'POST' }));

export const useArchiveCase = () =>
  useCaseAction(({ id, archived }: { id: string; archived: boolean }) =>
    api<AuthoringCase>(`/lecturer/cases/${id}/${archived ? 'archive' : 'restore'}`, { method: 'POST' }),
  );
