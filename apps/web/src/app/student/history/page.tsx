'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AlertTriangle, ShieldCheck, Trash2 } from 'lucide-react';
import type { SessionListItem, SessionStatus } from '@lab-fourt/shared';
import { Modal } from '@/components/modal';
import { Notice, PageHead } from '@/components/ui';
import { ApiRequestError } from '@/lib/api';
import { useDeleteSession } from '@/lib/assignments';
import { fmtDateTime, useSessions } from '@/lib/sessions';

const STATUS: Record<SessionStatus, { label: string; tone: string }> = {
  IN_PROGRESS: { label: 'Đang thực hành', tone: 'brand' },
  ABANDONED: { label: 'Tạm dừng', tone: 'warn' },
  ENDED: { label: 'Đã kết thúc', tone: 'ok' },
};

const daysLeft = (iso: string | null) => (iso ? Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000)) : null);

/** SCR-10 Lịch sử phiên: xem lại, trạng thái nộp, xóa mềm trong 14 ngày (FR-DATA-02) */
export default function HistoryPage() {
  const sessions = useSessions();
  const remove = useDeleteSession();
  const [target, setTarget] = useState<SessionListItem | null>(null);
  return (
    <>
      <PageHead title="Lịch sử thực hành" sub="Các phiên của bạn được giữ 14 ngày kể từ khi kết thúc." />
      <section className="panel table-wrap" style={{ padding: 0 }}>
        {sessions.isPending && (
          <p className="muted" style={{ padding: 22 }}>
            Đang tải...
          </p>
        )}
        {sessions.isError && (
          <p role="alert" style={{ padding: 22 }}>
            Không tải được lịch sử thực hành.
          </p>
        )}
        {sessions.data && !sessions.data.length && (
          <p className="muted" style={{ padding: 22 }}>
            Bạn chưa có phiên nào. <Link href="/student/cases">Chọn một ca để bắt đầu</Link>.
          </p>
        )}
        {!!sessions.data?.length && (
          <table className="t">
            <thead>
              <tr>
                <th scope="col">Ca</th>
                <th scope="col">Bắt đầu</th>
                <th scope="col">Lượt của bạn</th>
                <th scope="col">Trạng thái</th>
                <th scope="col">Bài nộp</th>
                <th scope="col">Còn giữ</th>
                <th scope="col" className="act">
                  <span className="sr-only">Thao tác</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sessions.data.map((s) => {
                const left = daysLeft(s.retentionUntil);
                return (
                  <tr key={s.id}>
                    <td>
                      <b style={{ fontWeight: 600 }}>{s.caseTitle}</b>
                      <div className="small muted">Thân chủ {s.clientName}</div>
                    </td>
                    <td className="num">{fmtDateTime(s.startedAt)}</td>
                    <td className="num">{s.studentTurns}</td>
                    <td>
                      <span className={`badge ${STATUS[s.status].tone}`}>{STATUS[s.status].label}</span>
                    </td>
                    <td>
                      {s.submissionStatus === 'SUBMITTED' ? (
                        <span className="badge ok">Đã nộp</span>
                      ) : s.assignmentTitle ? (
                        <span className="badge warn">Chưa nộp</span>
                      ) : (
                        <span className="badge">Luyện tự do</span>
                      )}
                    </td>
                    <td className="num">{left === null ? '' : `${left} ngày`}</td>
                    <td className="act">
                      <Link className="btn ghost sm" href={s.status === 'ENDED' ? `/student/history/${s.id}` : `/session/${s.id}`}>
                        {s.status === 'ENDED' ? 'Xem báo cáo' : 'Quay lại phiên'}
                      </Link>
                      {s.status !== 'IN_PROGRESS' && (
                        <button type="button" className="btn danger-ghost sm" onClick={() => setTarget(s)}>
                          <Trash2 size={15} aria-hidden />
                          Xóa
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
      <Notice tone="neutral" icon={ShieldCheck}>
        <span className="small">
          Chỉ bạn và giảng viên được phân quyền xem được bài đã nộp. Giảng viên không đọc các phiên luyện tự do của bạn.
        </span>
      </Notice>
      {target && (
        <Modal
          title="Xóa phiên này?"
          onClose={() => setTarget(null)}
          footer={
            <>
              <button type="button" className="btn secondary" onClick={() => setTarget(null)}>
                Giữ lại
              </button>
              <button
                type="button"
                className="btn danger"
                disabled={remove.isPending}
                onClick={() => remove.mutate(target.id, { onSuccess: () => setTarget(null) })}
              >
                Xóa phiên
              </button>
            </>
          }
        >
          <p>Phiên, transcript và báo cáo sẽ không còn hiển thị với bạn.</p>
          {target.submissionStatus === 'SUBMITTED' && (
            <Notice tone="warn" icon={AlertTriangle}>
              Phiên này đã nộp. Xóa phiên sẽ rút bài khỏi danh sách của giảng viên.
            </Notice>
          )}
          {remove.error && (
            <Notice tone="danger" icon={AlertTriangle}>
              {remove.error instanceof ApiRequestError ? remove.error.message : 'Chưa xóa được, hãy thử lại.'}
            </Notice>
          )}
        </Modal>
      )}
    </>
  );
}
