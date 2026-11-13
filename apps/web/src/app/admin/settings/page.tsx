'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle2, ShieldCheck } from 'lucide-react';
import type { AdminSettings, SystemSettings } from '@lab-fourt/shared';
import { Field, Notice, PageHead } from '@/components/ui';
import { ApiRequestError } from '@/lib/api';
import { useAdminSettings, useSaveSettings } from '@/lib/admin';

type NumberKey = { [K in keyof SystemSettings]: SystemSettings[K] extends number ? K : never }[keyof SystemSettings];

const NUMBERS: { key: NumberKey; label: string; hint: string; min: number; max: number }[] = [
  { key: 'retention.days', label: 'Thời hạn lưu phiên (ngày)', hint: 'Quá hạn thì phiên chuyển sang Đã lưu trữ.', min: 1, max: 365 },
  { key: 'session.defaultDurationMin', label: 'Độ dài phiên mặc định (phút)', hint: 'Dùng khi soạn ca mới.', min: 5, max: 90 },
  { key: 'session.idleTimeoutMin', label: 'Thời gian không hoạt động (phút)', hint: 'Quá thời gian này phiên chuyển sang Bỏ dở.', min: 5, max: 120 },
  { key: 'auth.maxFailedLogins', label: 'Số lần nhập sai mật khẩu', hint: 'Đạt ngưỡng thì khóa tạm tài khoản.', min: 3, max: 20 },
  { key: 'auth.lockMinutes', label: 'Thời gian khóa tạm (phút)', hint: 'Sau thời gian này người dùng thử lại được.', min: 1, max: 1440 },
  { key: 'auth.rememberDays', label: 'Ghi nhớ đăng nhập (ngày)', hint: 'Áp dụng khi người dùng chọn Ghi nhớ đăng nhập.', min: 1, max: 90 },
];

const SettingsForm = ({ initial }: { initial: AdminSettings }) => {
  const save = useSaveSettings();
  const [v, setV] = useState<SystemSettings>(initial.values);
  const fields = save.error instanceof ApiRequestError ? save.error.fields : undefined;
  return (
    <>
      <section className="panel stack">
        <h2>Thời hạn và giới hạn</h2>
        <div className="grid-2-eq">
          {NUMBERS.map((n) => (
            <Field key={n.key} id={`s-${n.key}`} label={n.label} hint={n.hint} error={fields?.[n.key]}>
              <input
                id={`s-${n.key}`}
                className="input num"
                type="number"
                min={n.min}
                max={n.max}
                value={v[n.key]}
                onChange={(e) => setV({ ...v, [n.key]: Number(e.target.value) })}
              />
            </Field>
          ))}
        </div>
      </section>
      <section className="panel stack">
        <h2>Đăng ký tài khoản</h2>
        <label className="check">
          <input
            id="s-registration"
            type="checkbox"
            checked={v['auth.registrationEnabled']}
            onChange={(e) => setV({ ...v, 'auth.registrationEnabled': e.target.checked })}
          />
          <span>
            Cho phép sinh viên tự đăng ký
            <span className="small muted" style={{ display: 'block' }}>
              Tài khoản tự đăng ký ở trạng thái Chờ duyệt, chỉ đăng nhập được sau khi quản trị viên duyệt ở trang Tài khoản.
            </span>
          </span>
        </label>
      </section>
      <section className="panel stack">
        <h2>Hướng dẫn an toàn</h2>
        <Field
          id="s-safety"
          label="Nội dung hiện khi thân chủ có tín hiệu nguy cơ"
          hint="Nội dung hiện tại là minh họa, cần giảng viên xác nhận (OI-03)."
          error={fields?.['safety.guidance']}
        >
          <textarea id="s-safety" className="textarea" rows={5} value={v['safety.guidance']} onChange={(e) => setV({ ...v, 'safety.guidance': e.target.value })} />
        </Field>
      </section>
      <div className="row">
        <button type="button" className="btn primary" disabled={save.isPending} onClick={() => save.mutate(v)}>
          {save.isPending ? 'Đang lưu...' : 'Lưu cấu hình'}
        </button>
        {save.isSuccess && (
          <span className="small" role="status">
            <CheckCircle2 size={14} aria-hidden style={{ verticalAlign: -2, marginRight: 6 }} />
            Đã lưu. Thay đổi có hiệu lực ngay.
          </span>
        )}
      </div>
      {save.error && !fields && (
        <Notice tone="danger" icon={AlertTriangle}>
          {save.error instanceof ApiRequestError ? save.error.message : 'Chưa lưu được, hãy thử lại.'}
        </Notice>
      )}
    </>
  );
};

/** SCR-20 Cấu hình (FR-ADM-02, FR-ADM-06, FR-DATA-05, FR-SAFE-02) */
export default function AdminSettingsPage() {
  const settings = useAdminSettings();
  return (
    <>
      <PageHead title="Cấu hình" sub="Tham số hệ thống. Mọi thay đổi được ghi vào nhật ký." />
      {settings.data && (
        <>
          <section className="panel stack">
            <h2>Dịch vụ AI và nhận dạng giọng nói</h2>
            <p>
              Đang dùng: <b style={{ fontWeight: 600 }}>{settings.data.services.aiProvider === 'mock' ? 'dịch vụ giả lập' : 'dịch vụ thật'}</b>.{' '}
              {settings.data.services.aiConfigured ? 'Đã cấu hình.' : 'Chưa cấu hình địa chỉ hoặc khóa.'}
            </p>
            <Notice tone="neutral" icon={ShieldCheck}>
              <span className="small">
                Địa chỉ và khóa bí mật của dịch vụ đặt trong biến môi trường trên máy chủ, không hiển thị trên trình duyệt.
              </span>
            </Notice>
          </section>
          <SettingsForm initial={settings.data} />
        </>
      )}
      {settings.isPending && <p className="muted">Đang tải...</p>}
    </>
  );
}
