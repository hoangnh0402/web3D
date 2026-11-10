'use client';

import { useState } from 'react';
import { AUDIT_LABELS } from '@lab-fourt/shared';
import { Field, PageHead } from '@/components/ui';
import { useAuditLog } from '@/lib/admin';
import { fmtDateTime } from '@/lib/sessions';

const GROUPS: { value: string; label: string }[] = [
  { value: '', label: 'Mọi sự kiện' },
  { value: 'auth.', label: 'Đăng nhập, mật khẩu' },
  { value: 'user.', label: 'Tài khoản' },
  { value: 'data.', label: 'Trạng thái dữ liệu' },
  { value: 'settings.', label: 'Cấu hình' },
  { value: 'session.', label: 'Phiên thực hành' },
  { value: 'case.', label: 'Ca mô phỏng' },
  { value: 'assignment.', label: 'Giao bài' },
  { value: 'safety.', label: 'An toàn' },
  { value: 'access.', label: 'Truy cập bị từ chối' },
];

const brief = (v: unknown) => (v && typeof v === 'object' ? JSON.stringify(v).slice(0, 160) : '');

/** SCR-22 Nhật ký kiểm toán, chỉ đọc (FR-ADM-05, NFR-SEC-10) */
export default function AdminAuditPage() {
  const [action, setAction] = useState('');
  const [actor, setActor] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const log = useAuditLog({
    action: action || undefined,
    actor: actor || undefined,
    from: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
    to: to ? new Date(`${to}T23:59:59`).toISOString() : undefined,
    page,
  });
  const pages = log.data ? Math.max(1, Math.ceil(log.data.total / log.data.pageSize)) : 1;
  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };

  return (
    <>
      <PageHead title="Nhật ký" sub="Ghi lại đăng nhập, đổi quyền, đổi trạng thái dữ liệu và đổi cấu hình. Không sửa được từ giao diện." />
      <div className="row" style={{ alignItems: 'flex-end' }}>
        <Field id="a-action" label="Loại sự kiện">
          <select id="a-action" className="select" value={action} onChange={(e) => reset(setAction)(e.target.value)}>
            {GROUPS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </Field>
        <Field id="a-actor" label="Người thực hiện">
          <input id="a-actor" className="input" value={actor} onChange={(e) => reset(setActor)(e.target.value)} />
        </Field>
        <Field id="a-from" label="Từ ngày">
          <input id="a-from" className="input" type="date" value={from} onChange={(e) => reset(setFrom)(e.target.value)} />
        </Field>
        <Field id="a-to" label="Đến ngày">
          <input id="a-to" className="input" type="date" value={to} onChange={(e) => reset(setTo)(e.target.value)} />
        </Field>
      </div>
      <section className="panel flush">
        <div className="table-wrap">
          <table className="t">
            <thead>
              <tr>
                <th scope="col">Thời điểm</th>
                <th scope="col">Người thực hiện</th>
                <th scope="col">Sự kiện</th>
                <th scope="col">Đối tượng</th>
                <th scope="col">Chi tiết</th>
                <th scope="col">IP</th>
              </tr>
            </thead>
            <tbody>
              {log.data?.items.map((r) => (
                <tr key={r.id}>
                  <td className="num">{fmtDateTime(r.createdAt)}</td>
                  <td>{r.actorName ?? 'Hệ thống'}</td>
                  <td>{AUDIT_LABELS[r.action] ?? r.action}</td>
                  <td className="small">
                    {r.entityType}
                    {r.entityId && <div className="muted num">{r.entityId.slice(0, 8)}</div>}
                  </td>
                  <td className="small" style={{ maxWidth: 360, wordBreak: 'break-word' }}>
                    {r.before ? <div className="muted">Trước: {brief(r.before)}</div> : null}
                    {r.after ? <div>Sau: {brief(r.after)}</div> : null}
                  </td>
                  <td className="num small">{r.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {log.data && !log.data.items.length && (
          <p className="muted" style={{ padding: 22 }}>
            Không có sự kiện nào khớp bộ lọc.
          </p>
        )}
      </section>
      {log.data && (
        <div className="row between">
          <button type="button" className="btn secondary sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Trang trước
          </button>
          <span className="small muted num">
            Trang {page}/{pages}, {log.data.total} sự kiện
          </span>
          <button type="button" className="btn secondary sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>
            Trang sau
          </button>
        </div>
      )}
    </>
  );
}
