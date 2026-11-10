'use client';

import { useEffect, useRef, useState } from 'react';
import { SESSION_EVENT_TYPES, type SessionEvent } from '@lab-fourt/shared';

export type StreamState = 'connecting' | 'open' | 'reconnecting';

/**
 * Nghe luồng SSE của phiên. EventSource tự kết nối lại và gửi Last-Event-ID để nhận bù sự kiện đã lỡ.
 * Sau khi kết nối lại, gọi onResync để tải lại phiên từ máy chủ, phòng khi API đã khởi động lại và mất bộ đệm.
 */
export const useSessionStream = (
  sessionId: string,
  enabled: boolean,
  onEvent: (event: SessionEvent) => void,
  onResync: () => void,
) => {
  const [state, setState] = useState<StreamState>('connecting');
  const handlers = useRef({ onEvent, onResync });
  useEffect(() => {
    handlers.current = { onEvent, onResync };
  });

  useEffect(() => {
    if (!enabled) return;
    const source = new EventSource(`/api/sessions/${sessionId}/events`, { withCredentials: true });
    let dropped = false;
    source.onopen = () => {
      setState('open');
      if (dropped) handlers.current.onResync();
      dropped = false;
    };
    source.onerror = () => {
      dropped = true;
      setState('reconnecting');
    };
    for (const type of SESSION_EVENT_TYPES) {
      source.addEventListener(type, (e) => {
        try {
          handlers.current.onEvent({ type, ...JSON.parse((e as MessageEvent<string>).data) } as SessionEvent);
        } catch {
          // Bỏ qua sự kiện hỏng, lần đồng bộ sau sẽ lấy lại dữ liệu đúng
        }
      });
    }
    return () => source.close();
  }, [sessionId, enabled]);

  return state;
};
