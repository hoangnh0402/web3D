'use client';

import Link from 'next/link';
import { use } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, Mic } from 'lucide-react';
import { MsgLine } from '@/components/msg-line';
import { Notice, PageHead } from '@/components/ui';
import { fmtDateTime, useSession } from '@/lib/sessions';

/** SCR-08 Transcript, có phân biệt người nói (FR-RPT-08) và nhảy tới lượt được trích dẫn (FR-RPT-05) */
export default function TranscriptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const focus = Number(useSearchParams().get('luot')) || null;
  const session = useSession(id);

  if (session.isError) {
    return (
      <Notice tone="danger" icon={AlertTriangle}>
        Không tìm thấy phiên này. <Link href="/student/history">Về lịch sử thực hành</Link>
      </Notice>
    );
  }
  if (!session.data) return <p className="muted">Đang tải...</p>;
  const s = session.data;

  return (
    <>
      <Link className="crumb" href={`/student/history/${id}`}>
        ‹ Báo cáo
      </Link>
      <PageHead title="Transcript" sub={`${s.case.title}, thân chủ ${s.case.clientName}, phiên ${fmtDateTime(s.startedAt)}.`} />
      <Notice tone="neutral" icon={Mic}>
        <span className="small">
          Lượt có biểu tượng micro được chuyển từ giọng nói sang văn bản, nên có thể khác đôi chút so với lời nói thật. Thân chủ do AI
          đóng vai trong môi trường mô phỏng.
        </span>
      </Notice>
      <section className="panel stack" style={{ maxWidth: 760 }} aria-label="Hội thoại">
        {s.messages.map((m) => (
          <MsgLine key={m.seq} m={m} clientName={s.case.clientName} focus={focus === m.seq} />
        ))}
      </section>
    </>
  );
}
