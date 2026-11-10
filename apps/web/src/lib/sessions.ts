'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CaseDetail,
  CaseSummary,
  MessageDto,
  RenderMode,
  SessionDetail,
  SessionListItem,
  StartSessionInput,
  TurnInput,
} from '@lab-fourt/shared';
import { api } from './api';

export const useCases = () => useQuery({ queryKey: ['cases'], queryFn: () => api<CaseSummary[]>('/cases') });

export const useCase = (id: string) => useQuery({ queryKey: ['cases', id], queryFn: () => api<CaseDetail>(`/cases/${id}`) });

export const useActiveSession = () =>
  useQuery({
    queryKey: ['sessions', 'active'],
    queryFn: () => api<{ session: { id: string } | null }>('/sessions/active').then((r) => r.session),
  });

export const useSessions = () => useQuery({ queryKey: ['sessions'], queryFn: () => api<SessionListItem[]>('/sessions') });

export const sessionKey = (id: string) => ['sessions', id] as const;

export const useSession = (id: string) =>
  useQuery({ queryKey: sessionKey(id), queryFn: () => api<SessionDetail>(`/sessions/${id}`), refetchOnWindowFocus: false });

export const useStartSession = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: StartSessionInput) => api<{ id: string }>('/sessions', { method: 'POST', body: input }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['sessions'] }),
  });
};

export const sendTurn = (id: string, turn: TurnInput) => api<MessageDto>(`/sessions/${id}/turns`, { method: 'POST', body: turn });

export const endSession = (id: string) => api<SessionDetail>(`/sessions/${id}/end`, { method: 'POST' });

export const setRenderMode = (id: string, renderMode: RenderMode) =>
  api<void>(`/sessions/${id}`, { method: 'PATCH', body: { renderMode } });

export const transcribe = (id: string, audio: Blob) => {
  const form = new FormData();
  const ext = audio.type.includes('mp4') ? 'mp4' : audio.type.includes('ogg') ? 'ogg' : 'webm';
  form.append('audio', audio, `loi-noi.${ext}`);
  return api<{ text: string; confidence: number | null }>(`/sessions/${id}/speech`, { method: 'POST', body: form });
};

export const DIFFICULTY_LABELS: Record<number, string> = { 1: 'Cơ bản', 2: 'Trung bình', 3: 'Nâng cao' };

export const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
