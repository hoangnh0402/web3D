'use client';

import { useState } from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import type { AdminSessionRow, RecordStatus } from '@lab-fourt/shared';
import { Modal } from '@/components/modal';
import { Field, Notice, PageHead } from '@/components/ui';
import { ApiRequestError } from '@/lib/api';
import { useAdminSessions, useRerunAssessment, useSetRecordStatus } from '@/lib/admin';
import { fmtDateTime } from '@/lib/sessions';

const RECORD: Record<RecordStatus, { label: string; tone: string }> = {
  ACTIVE: { label: 'Đang hiệu lực', tone: 'ok' },
  ARCHIVED: { label: 'Đã lưu trữ', tone: '' },
  DELETED: { label: 'Đã xóa', tone: 'danger' },
};
const REPORT: Record<string, string> = { PENDING: 'Chờ tạo', PROCESSING: 'Đang tạo', READY: 'Đã có', FAILED: 'Lỗi' };
const errorText = (e: unknown) => (e instanceof ApiRequestError ? e.message : e ? 'Thao tác chưa thành công, hãy thử lại.' : '');
const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

/** SCR-19 Quản lý dữ liệu phiên theo trạng thái, khôi phục (FR-DATA-04) và chạy lại báo cáo lỗi (FR-RPT-02) */
export default function AdminDataPage() {
  const [filter, setFilter] = useState<'' | RecordStatus>('');
  const [q, setQ] = useState('');
  const rows = useAdminSessions(filter, q);
  const setStatus = useSetRecordStatus();
  const rerun = useRerunAssessment();
  const [target, setTarget] = useState<{ row: AdminSessionRow; to: RecordStatus } | null>(null);
  const [until, setUntil] = useState(inDays(14));

  const apply = () => {
    if (!target) return;
    setStatus.mutate(
      {
        id: target.row.id,
        recordStatus: target.to,
        ...(target.to === 'ACTIVE' ? { retentionUntil: new Date(`${until}T23:59:59`).toISOString() } : {}),
      },
      { onSuccess: () => setTarget(null) },
    );
  };

  return (
    <>
      <PageHead title="Dữ liệu phiên" sub="Dữ liệu không bị xóa vĩnh viễn. Mọi lần đổi trạng thái được ghi vào nhật ký." />
      <div className="row" style={{ alignItems: 'flex-end' }}>
        <div className="chips" role="group" aria-label="Lọc theo trạng thái bản ghi">
          {(['', 'ACTIVE', 'ARCHIVED', 'DELETED'] as const).map((s) => (
            <button key={s || 'all'} type="button" className="chip" aria-pressed={filter === s} onClick={() => setFilter(s)}>
              {s ? RECORD[s].label : 'Tất cả'}
            </button>
          ))}
        </div>
        <div style={{ minWidth: 260 }}>
          <Field id="data-q" label="Tìm theo sinh viên hoặc ca">
            <input id="data-q" className="input" value={q} onChange={(e) => setQ(e.target.value)} />
          </Field>
        </div>
      </div>
      {(rerun.error || setStatus.error) && !target && (
        <Notice tone="danger" icon={AlertTriangle}>
          {errorText(rerun.error ?? setStatus.error)}
        </Notice>
      )}
      <section className="panel flush">
        <div className="table-wrap">
          <table className="t">
            <thead>
              <tr>
                <th scope="col">Sinh viên</th>
                <th scope="col">Ca</th>
                <th scope="col">Bắt đầu</th>
                <th scope="col">Báo cáo</th>
                <th scope="col">Bản ghi</th>
                <th scope="col">Hạn lưu</th>
                <th scope="col" className="act">
                  <span className="sr-only">Thao tác</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.data?.map((r) => (
                <tr key={r.id}>
                  <td>
                    {r.studentName}
                    <div className="small muted">{r.username}</div>
                  </td>
                  <td>
                    {r.caseTitle}
                    {r.submitted && <div className="small muted">Đã nộp</div>}
                  </td>
                  <td className="num">{fmtDateTime(r.startedAt)}</td>
                  <td>
                    {r.assessmentStatus ? REPORT[r.assessmentStatus] : ''}
                    {r.assessmentStatus === 'FAILED' && (
                      <button type="button" className="btn ghost sm" disabled={rerun.isPending} onClick={() => rerun.mutate(r.id)}>
                        Chạy lại
                      </button>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${RECORD[r.recordStatus].tone}`}>{RECORD[r.recordStatus].label}</span>
                  </td>
                  <td className="num">{r.retentionUntil ? fmtDateTime(r.retentionUntil) : ''}</td>
                  <td className="act">
                    {r.recordStatus !== 'ACTIVE' && (
                      <button type="button" className="btn ghost sm" onClick={() => setTarget({ row: r, to: 'ACTIVE' })}>
                        Khôi phục
                      </button>
                    )}
                    {r.recordStatus === 'ACTIVE' && r.status !== 'IN_PROGRESS' && (
                      <button type="button" className="btn ghost sm" onClick={() => setTarget({ row: r, to: 'ARCHIVED' })}>
                        Lưu trữ
                      </button>
                    )}
                    {r.recordStatus !== 'DELETED' && r.status !== 'IN_PROGRESS' && (
                      <button type="button" className="btn danger-ghost sm" onClick={() => setTarget({ row: r, to: 'DELETED' })}>
                        Xóa
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.data && !rows.data.length && (
          <p className="muted" style={{ padding: 22 }}>
            Không có phiên nào khớp bộ lọc.
          </p>
        )}
      </section>
      <Notice tone="neutral" icon={Info}>
        <span className="small">
          Phiên Đã lưu trữ hoặc Đã xóa bị ẩn với sinh viên và giảng viên. Xóa phiên đã nộp sẽ chuyển bài nộp sang đã rút.
        </span>
      </Notice>
      {target && (
        <Modal
          title={target.to === 'ACTIVE' ? 'Khôi phục phiên?' : target.to === 'ARCHIVED' ? 'Lưu trữ phiên?' : 'Xóa phiên?'}
          onClose={() => setTarget(null)}
          footer={
            <>
              <button type="button" className="btn secondary" onClick={() => setTarget(null)}>
                Hủy
              </button>
              <button type="button" className={`btn ${target.to === 'DELETED' ? 'danger' : 'primary'}`} disabled={setStatus.isPending} onClick={apply}>
                Xác nhận
              </button>
            </>
          }
        >
          <p>
            Phiên của {target.row.studentName}, ca {target.row.caseTitle}: {RECORD[target.row.recordStatus].label} sang {RECORD[target.to].label}.
          </p>
          {target.to === 'ACTIVE' && (
            <Field id="restore-until" label="Hạn lưu mới" hint="Bắt buộc, nếu không tác vụ định kỳ sẽ lưu trữ lại phiên ngay.">
              <input id="restore-until" className="input" type="date" min={inDays(1)} value={until} onChange={(e) => setUntil(e.target.value)} />
            </Field>
          )}
          {setStatus.error && (
            <Notice tone="danger" icon={AlertTriangle}>
              {errorText(setStatus.error)}
            </Notice>
          )}
        </Modal>
      )}
    </>
  );
}
