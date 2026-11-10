'use client';

import { useEffect, useRef } from 'react';
import { Mic } from 'lucide-react';
import type { MessageDto } from '@lab-fourt/shared';
import { fmtTime } from '@/lib/sessions';

/** Ngưỡng độ tin cậy nhận dạng thấp, cần xem xét thận trọng (FR-RPT-09) */
export const LOW_CONFIDENCE = 0.8;

/**
 * Một lượt trong hội thoại. Nội dung hiển thị dạng văn bản thuần, React tự thoát ký tự HTML (NFR-SEC-09).
 * Lời người học và lời thân chủ phân biệt bằng vị trí, màu và nhãn (FR-CONV-07).
 * focus: cuộn tới và làm nổi lượt được trích làm dẫn chứng (FR-RPT-05).
 */
export const MsgLine = ({ m, clientName, you = 'Bạn', focus }: { m: MessageDto; clientName: string; you?: string; focus?: boolean }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (focus) ref.current?.scrollIntoView({ block: 'center' });
  }, [focus]);
  return (
    <div ref={ref} id={`luot-${m.seq}`} className={`msg ${m.speaker === 'STUDENT' ? 'student' : 'client'} ${focus ? 'focus' : ''}`}>
      <div className="who-line">
        <span className="num">Lượt {m.seq}</span>
        <span>{m.speaker === 'STUDENT' ? you : clientName}</span>
        <span className="num">{fmtTime(m.createdAt)}</span>
        {m.inputMode === 'VOICE' && <Mic size={12} aria-label="Nhập bằng giọng nói" />}
        {m.sttEdited && <span>đã sửa</span>}
        {m.sttConfidence !== null && m.sttConfidence < LOW_CONFIDENCE && <span className="badge warn">Độ tin cậy thấp</span>}
      </div>
      <div className="text">{m.content}</div>
    </div>
  );
};
