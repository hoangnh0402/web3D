'use client';

import Link from 'next/link';
import { use } from 'react';
import { AlertTriangle, Download } from 'lucide-react';
import type { ProgressState } from '@lab-fourt/shared';
import { Notice, PageHead } from '@/components/ui';
import { fmtDue, useAssignmentProgress, useSetAssignmentStatus } from '@/lib/assignments';
import { fmtDateTime } from '@/lib/sessions';

const STATE: Record<ProgressState, { label: string; tone: string }> = {
  NOT_STARTED: { label: 'Chưa bắt đầu', tone: '' },
  IN_PROGRESS: { label: 'Đang thực hành', tone: 'brand' },
  NOT_SUBMITTED: { label: 'Chưa nộp', tone: 'warn' },
  SUBMITTED: { label: 'Đã nộp', tone: 'ok' },
  WITHDRAWN: { label: 'Người học đã rút bài', tone: 'danger' },
};

/** SCR-14 Tiến độ theo bài được giao (FR-LEC-01) */
export default function ProgressPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const progress = useAssignmentProgress(id);
  const setStatus = useSetAssignmentStatus(id);

  if (progress.isError) {
    return (
      <Notice tone="danger" icon={AlertTriangle}>
        Không tìm thấy bài được giao. <Link href="/lecturer">Về tổng quan</Link>
      </Notice>
    );
  }
  if (!progress.data) return <p className="muted">Đang tải...</p>;
  const p = progress.data;

  return (
    <>
      <Link className="crumb" href="/lecturer">
        ‹ Tổng quan
      </Link>
      <PageHead
        title={p.title}
        sub={`${p.caseTitle}, hạn ${fmtDue(p.dueAt)}. Đã nộp ${p.submittedCount}/${p.targetCount}${p.lateCount ? `, ${p.lateCount} bài trễ` : ''}.`}
        actions={
          <>
            {/* Tải trực tiếp tệp CSV; máy chủ kiểm tra quyền và ghi nhật ký (FR-LEC-06) */}
            <a className="btn secondary" href={`/api/lecturer/assignments/${id}/export`} download>
              <Download size={17} aria-hidden />
              Xuất CSV
            </a>
            <button
              type="button"
              className="btn secondary"
              disabled={setStatus.isPending}
              onClick={() =>
                setStatus.mutate(p.status === 'OPEN' ? 'CLOSED' : 'OPEN', { onSuccess: () => void progress.refetch() })
              }
            >
              {p.status === 'OPEN' ? 'Đóng bài' : 'Mở lại bài'}
            </button>
          </>
        }
      />
      <section className="panel flush">
        <div className="table-wrap">
          <table className="t">
            <thead>
              <tr>
                <th scope="col">Sinh viên</th>
                <th scope="col">Trạng thái</th>
                <th scope="col">Nộp lúc</th>
                <th scope="col" className="act">
                  <span className="sr-only">Thao tác</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {p.rows.map((r) => (
                <tr key={r.userId}>
                  <td>
                    {r.fullName}
                    <div className="small muted">{r.username}</div>
                  </td>
                  <td>
                    <span className={`badge ${STATE[r.state].tone}`}>{STATE[r.state].label}</span>
                    {r.isLate && r.state === 'SUBMITTED' && <span className="badge warn"> Trễ hạn</span>}
                    {r.reviewed && <span className="small muted"> · đã xem xét</span>}
                  </td>
                  <td className="num">{r.submittedAt ? fmtDateTime(r.submittedAt) : ''}</td>
                  <td className="act">
                    {r.submissionId && (
                      <Link className="btn ghost sm" href={`/lecturer/submissions/${r.submissionId}`}>
                        {r.reviewed ? 'Xem lại' : 'Xem xét'}
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!p.rows.length && (
          <p className="muted" style={{ padding: 22 }}>
            Bài này chưa có sinh viên nào.
          </p>
        )}
      </section>
    </>
  );
}
