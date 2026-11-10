'use client';

import { useState } from 'react';
import { AlertTriangle, KeyRound, Lock, Unlock, Upload, UserPlus } from 'lucide-react';
import { ROLE_LABELS, ROLES, type AdminUser, type IssuedPassword, type Role } from '@lab-fourt/shared';
import { Modal } from '@/components/modal';
import { Field, Notice, PageHead } from '@/components/ui';
import { ApiRequestError } from '@/lib/api';
import { useMe } from '@/lib/auth';
import { useAdminUsers, useCreateUser, useImportUsers, useResetPassword, useUpdateUser } from '@/lib/admin';

const STATUS: Record<AdminUser['status'], { label: string; tone: string }> = {
  ACTIVE: { label: 'Đang hoạt động', tone: 'ok' },
  LOCKED: { label: 'Đã khóa', tone: 'warn' },
  DISABLED: { label: 'Vô hiệu hóa', tone: 'danger' },
};
const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString('vi-VN') : 'Chưa đăng nhập');
const errorText = (e: unknown) => (e instanceof ApiRequestError ? e.message : e ? 'Thao tác chưa thành công, hãy thử lại.' : '');

/** Mật khẩu tạm chỉ hiện một lần, quản trị viên chuyển cho người dùng */
const IssuedNotice = ({ issued, onClose }: { issued: IssuedPassword[]; onClose: () => void }) => (
  <Modal
    title="Mật khẩu tạm"
    onClose={onClose}
    footer={
      <button type="button" className="btn primary" onClick={onClose}>
        Tôi đã ghi lại
      </button>
    }
  >
    <p className="small">Mật khẩu chỉ hiện một lần. Người dùng phải đổi mật khẩu ở lần đăng nhập đầu.</p>
    <div className="table-wrap">
      <table className="t">
        <thead>
          <tr>
            <th scope="col">Tên đăng nhập</th>
            <th scope="col">Mật khẩu tạm</th>
          </tr>
        </thead>
        <tbody>
          {issued.map((i) => (
            <tr key={i.userId}>
              <td>{i.username}</td>
              <td>
                <code>{i.temporaryPassword}</code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </Modal>
);

/** SCR-17 Quản lý tài khoản (FR-USR-01, FR-USR-02, FR-AUTH-04) */
export default function AdminUsersPage() {
  const me = useMe();
  const [q, setQ] = useState('');
  const users = useAdminUsers(q);
  const create = useCreateUser();
  const update = useUpdateUser();
  const reset = useResetPassword();
  const importer = useImportUsers();
  const [form, setForm] = useState<{ username: string; fullName: string; role: Role } | null>(null);
  const [csv, setCsv] = useState<string | null>(null);
  const [issued, setIssued] = useState<IssuedPassword[] | null>(null);
  const [confirm, setConfirm] = useState<{ user: AdminUser; action: 'lock' | 'disable' | 'reset' } | null>(null);
  const fields = create.error instanceof ApiRequestError ? create.error.fields : undefined;

  const doConfirm = () => {
    if (!confirm) return;
    const { user, action } = confirm;
    if (action === 'reset') reset.mutate(user.id, { onSuccess: (r) => setIssued([r]), onSettled: () => setConfirm(null) });
    else update.mutate({ id: user.id, status: action === 'lock' ? 'LOCKED' : 'DISABLED' }, { onSettled: () => setConfirm(null) });
  };

  return (
    <>
      <PageHead
        title="Tài khoản"
        sub="Hệ thống không có đăng ký công khai. Tài khoản do quản trị viên tạo."
        actions={
          <>
            <button type="button" className="btn secondary" onClick={() => setCsv('')}>
              <Upload size={17} aria-hidden />
              Nhập CSV
            </button>
            <button type="button" className="btn primary" onClick={() => setForm({ username: '', fullName: '', role: 'STUDENT' })}>
              <UserPlus size={17} aria-hidden />
              Tạo tài khoản
            </button>
          </>
        }
      />
      <div style={{ maxWidth: 360 }}>
        <Field id="user-q" label="Tìm theo tên hoặc tên đăng nhập">
          <input id="user-q" className="input" value={q} onChange={(e) => setQ(e.target.value)} />
        </Field>
      </div>
      {(update.error || reset.error) && (
        <Notice tone="danger" icon={AlertTriangle}>
          {errorText(update.error ?? reset.error)}
        </Notice>
      )}
      <section className="panel flush">
        <div className="table-wrap">
          <table className="t">
            <thead>
              <tr>
                <th scope="col">Họ tên</th>
                <th scope="col">Tên đăng nhập</th>
                <th scope="col">Vai trò</th>
                <th scope="col">Trạng thái</th>
                <th scope="col">Lần đăng nhập gần nhất</th>
                <th scope="col" className="act">
                  <span className="sr-only">Thao tác</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {users.data?.map((u) => {
                const self = u.id === me.data?.id;
                return (
                  <tr key={u.id}>
                    <td>{u.fullName}</td>
                    <td>
                      <code>{u.username}</code>
                    </td>
                    <td>
                      <label className="sr-only" htmlFor={`role-${u.id}`}>
                        Vai trò của {u.fullName}
                      </label>
                      <select
                        id={`role-${u.id}`}
                        className="select"
                        style={{ width: 'auto', minHeight: 36, padding: '4px 10px' }}
                        value={u.role}
                        disabled={self}
                        onChange={(e) => update.mutate({ id: u.id, role: e.target.value as Role })}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <span className={`badge ${STATUS[u.status].tone}`}>{STATUS[u.status].label}</span>
                      {u.temporarilyLocked && <span className="badge warn"> Khóa tạm</span>}
                      {u.mustChangePassword && <div className="small muted">Chưa đổi mật khẩu</div>}
                    </td>
                    <td className="num">{fmt(u.lastLoginAt)}</td>
                    <td className="act">
                      <button type="button" className="btn ghost sm" onClick={() => setConfirm({ user: u, action: 'reset' })}>
                        <KeyRound size={15} aria-hidden />
                        Đặt lại mật khẩu
                      </button>
                      {u.status === 'ACTIVE' && !u.temporarilyLocked ? (
                        !self && (
                          <button type="button" className="btn ghost sm" onClick={() => setConfirm({ user: u, action: 'lock' })}>
                            <Lock size={15} aria-hidden />
                            Khóa
                          </button>
                        )
                      ) : (
                        <button type="button" className="btn ghost sm" onClick={() => update.mutate({ id: u.id, status: 'ACTIVE' })}>
                          <Unlock size={15} aria-hidden />
                          Mở khóa
                        </button>
                      )}
                      {u.status !== 'DISABLED' && !self && (
                        <button type="button" className="btn danger-ghost sm" onClick={() => setConfirm({ user: u, action: 'disable' })}>
                          Vô hiệu hóa
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {users.isPending && (
          <p className="muted" style={{ padding: 22 }}>
            Đang tải...
          </p>
        )}
      </section>

      {form && (
        <Modal
          title="Tạo tài khoản"
          onClose={() => setForm(null)}
          footer={
            <>
              <button type="button" className="btn secondary" onClick={() => setForm(null)}>
                Hủy
              </button>
              <button
                type="button"
                className="btn primary"
                disabled={create.isPending}
                onClick={() =>
                  create.mutate(form, {
                    onSuccess: (r) => {
                      setForm(null);
                      setIssued([r]);
                    },
                  })
                }
              >
                Tạo
              </button>
            </>
          }
        >
          <div className="stack">
            <Field id="nu-username" label="Tên đăng nhập" hint="Chữ thường không dấu, số, dấu chấm." error={fields?.username}>
              <input id="nu-username" className="input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })} />
            </Field>
            <Field id="nu-name" label="Họ tên" error={fields?.fullName}>
              <input id="nu-name" className="input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            </Field>
            <Field id="nu-role" label="Vai trò">
              <select id="nu-role" className="select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </Field>
            {create.error && !fields && (
              <Notice tone="danger" icon={AlertTriangle}>
                {errorText(create.error)}
              </Notice>
            )}
          </div>
        </Modal>
      )}

      {csv !== null && (
        <Modal
          title="Nhập tài khoản từ CSV"
          onClose={() => {
            setCsv(null);
            importer.reset();
          }}
          footer={
            <>
              <button type="button" className="btn secondary" onClick={() => setCsv(null)}>
                Đóng
              </button>
              <button
                type="button"
                className="btn primary"
                disabled={!csv.trim() || importer.isPending}
                onClick={() => importer.mutate(csv, { onSuccess: (r) => r.created.length && setIssued(r.created) })}
              >
                Nhập
              </button>
            </>
          }
        >
          <div className="stack">
            <p className="small">
              Mỗi dòng: <code>tên đăng nhập,họ tên,vai trò</code>. Vai trò là STUDENT, LECTURER hoặc ADMIN, bỏ trống là sinh viên.
            </p>
            <Field id="csv-file" label="Chọn tệp CSV">
              <input
                id="csv-file"
                type="file"
                accept=".csv,text/csv"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) setCsv(await f.text());
                }}
              />
            </Field>
            <Field id="csv-text" label="Hoặc dán nội dung">
              <textarea id="csv-text" className="textarea" rows={6} value={csv} onChange={(e) => setCsv(e.target.value)} />
            </Field>
            {importer.data && (
              <Notice tone={importer.data.errors.length ? 'warn' : 'neutral'} icon={AlertTriangle}>
                <div className="small">
                  Đã tạo {importer.data.created.length} tài khoản.
                  {importer.data.errors.map((er) => (
                    <div key={er.line}>
                      Dòng {er.line}: {er.message}
                    </div>
                  ))}
                </div>
              </Notice>
            )}
            {importer.error && (
              <Notice tone="danger" icon={AlertTriangle}>
                {errorText(importer.error)}
              </Notice>
            )}
          </div>
        </Modal>
      )}

      {confirm && (
        <Modal
          title={confirm.action === 'reset' ? 'Đặt lại mật khẩu?' : confirm.action === 'lock' ? 'Khóa tài khoản?' : 'Vô hiệu hóa tài khoản?'}
          onClose={() => setConfirm(null)}
          footer={
            <>
              <button type="button" className="btn secondary" onClick={() => setConfirm(null)}>
                Hủy
              </button>
              <button type="button" className={`btn ${confirm.action === 'reset' ? 'primary' : 'danger'}`} onClick={doConfirm}>
                Xác nhận
              </button>
            </>
          }
        >
          <p>
            {confirm.action === 'reset'
              ? `${confirm.user.fullName} sẽ nhận mật khẩu tạm mới và bị đăng xuất khỏi mọi thiết bị.`
              : `${confirm.user.fullName} sẽ bị đăng xuất ngay và không đăng nhập được. Lịch sử của tài khoản vẫn được giữ.`}
          </p>
        </Modal>
      )}

      {issued && <IssuedNotice issued={issued} onClose={() => setIssued(null)} />}
    </>
  );
}
