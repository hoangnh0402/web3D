'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AssignmentProgress,
  ClassMember,
  ClassSkillStats,
  CreateAssignmentInput,
  LecturerAssignment,
  LecturerClass,
  MyAssignment,
  ReviewInput,
  SessionDetail,
  SubmissionReview,
} from '@lab-fourt/shared';
import { api } from './api';

// ---------- Sinh viên ----------

export const useMyAssignments = () => useQuery({ queryKey: ['assignments', 'mine'], queryFn: () => api<MyAssignment[]>('/assignments/mine') });

export const useSubmit = (sessionId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: string) => api<SessionDetail>(`/sessions/${sessionId}/submit`, { method: 'POST', body: { assignmentId } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['sessions'] });
      void qc.invalidateQueries({ queryKey: ['assignments'] });
    },
  });
};

export const useDeleteSession = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => api<void>(`/sessions/${sessionId}`, { method: 'DELETE' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['sessions'] });
      void qc.invalidateQueries({ queryKey: ['assignments'] });
    },
  });
};

// ---------- Giảng viên ----------

export const useLecturerClasses = () => useQuery({ queryKey: ['lecturer', 'classes'], queryFn: () => api<LecturerClass[]>('/lecturer/classes') });

export const useClassMembers = (classId: string | null) =>
  useQuery({
    queryKey: ['lecturer', 'classes', classId, 'students'],
    queryFn: () => api<ClassMember[]>(`/lecturer/classes/${classId}/students`),
    enabled: !!classId,
  });

export const useClassStats = (classId: string | null) =>
  useQuery({
    queryKey: ['lecturer', 'classes', classId, 'stats'],
    queryFn: () => api<ClassSkillStats>(`/lecturer/classes/${classId}/stats`),
    enabled: !!classId,
  });

export const useLecturerAssignments = () =>
  useQuery({ queryKey: ['lecturer', 'assignments'], queryFn: () => api<LecturerAssignment[]>('/lecturer/assignments') });

export const useAssignmentProgress = (id: string) =>
  useQuery({ queryKey: ['lecturer', 'assignments', id], queryFn: () => api<AssignmentProgress>(`/lecturer/assignments/${id}`) });

export const useCreateAssignment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAssignmentInput) => api<{ id: string }>('/lecturer/assignments', { method: 'POST', body: input }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['lecturer', 'assignments'] }),
  });
};

export const useSetAssignmentStatus = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (status: 'OPEN' | 'CLOSED') => api<void>(`/lecturer/assignments/${id}`, { method: 'PATCH', body: { status } }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['lecturer', 'assignments'] }),
  });
};

export const useSubmissionReview = (id: string) =>
  useQuery({ queryKey: ['lecturer', 'submissions', id], queryFn: () => api<SubmissionReview>(`/lecturer/submissions/${id}`) });

export const useSaveReview = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ReviewInput) => api<SubmissionReview>(`/lecturer/submissions/${id}/review`, { method: 'PUT', body: input }),
    onSuccess: (data) => {
      qc.setQueryData(['lecturer', 'submissions', id], data);
      void qc.invalidateQueries({ queryKey: ['lecturer', 'assignments'] });
    },
  });
};

export const useClassMemberActions = (classId: string) => {
  const qc = useQueryClient();
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['lecturer', 'classes'] });
  };
  return {
    add: useMutation({
      mutationFn: (username: string) => api<ClassMember[]>(`/lecturer/classes/${classId}/students`, { method: 'POST', body: { username } }),
      onSuccess: refresh,
    }),
    remove: useMutation({
      mutationFn: (userId: string) => api<void>(`/lecturer/classes/${classId}/students/${userId}`, { method: 'DELETE' }),
      onSuccess: refresh,
    }),
  };
};

export const fmtDue = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : 'Không có hạn';
