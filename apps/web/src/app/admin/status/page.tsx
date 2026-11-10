'use client';

import { CheckCircle2, XCircle } from 'lucide-react';
import { PageHead } from '@/components/ui';
import { useSystemStatus } from '@/lib/admin';
import { fmtDateTime } from '@/lib/sessions';

const KIND: Record<string, string> = { CONVERSATION: 'Hội thoại', ASSESSMENT: 'Báo cáo', STT: 'Nhận dạng giọng nói' };

const Health = ({ label, ok, detail }: { label: string; ok: boolean; detail?: string }) => (
  <div className="stat">
    <span className="row" style={{ gap: 8 }}>
      {ok ? <CheckCircle2 size={22} color="var(--ok)" aria-hidden /> : <XCircle size={22} color="var(--danger)" aria-hidden />}
      <b style={{ fontWeight: 600, color: 'var(--navy-900)' }}>{label}</b>
    </span>
    <span>{ok ? 'Hoạt động bình thường' : 'Đang gặp sự cố'}</span>
    {detail && <span className="small muted">{detail}</span>}
  </div>
);

/** SCR-21 Trạng thái hệ thống và mức dùng AI 7 ngày (FR-ADM-03, FR-ADM-04). Tự cập nhật mỗi 30 giây. */
export default function AdminStatusPage() {
  const status = useSystemStatus();
  const s = status.data;
  // Tính tuổi bản sao lưu theo thời điểm tải trạng thái, không gọi giờ hiện tại trong lúc render
  const backupAge = s?.lastBackupAt ? (status.dataUpdatedAt - new Date(s.lastBackupAt).getTime()) / 3_600_000 : null;
  return (
    <>
      <PageHead title="Trạng thái hệ thống" sub="Tình trạng các dịch vụ, hàng đợi báo cáo, sao lưu và mức dùng AI." />
      {status.isError && <p role="alert">Không tải được trạng thái. API có thể đang gặp sự cố.</p>}
      {s && (
        <>
          <div className="grid-4">
            <Health label="API" ok />
            <Health label="Cơ sở dữ liệu" ok={s.database === 'ok'} />
            <Health label="Dịch vụ AI và STT" ok={s.ai === 'ok'} detail={s.aiProvider === 'mock' ? 'Đang dùng dịch vụ giả lập' : undefined} />
            <Health
              label="Sao lưu"
              ok={backupAge !== null && backupAge < 26}
              detail={s.lastBackupAt ? `Gần nhất ${fmtDateTime(s.lastBackupAt)}` : 'Chưa có bản sao lưu nào được ghi nhận'}
            />
          </div>
          <div className="grid-4">
            <div className="stat">
              <span className="big">{s.assessments.pending}</span>
              <span>Báo cáo đang chờ tạo</span>
            </div>
            <div className="stat">
              <span className="big">{s.assessments.failed}</span>
              <span>Báo cáo lỗi, chạy lại ở trang Dữ liệu phiên</span>
            </div>
            <div className="stat">
              <span className="big">{s.openSafetyEvents}</span>
              <span>Tín hiệu an toàn chưa xử lý</span>
            </div>
          </div>
          <section className="panel flush">
            <div className="panel-head">
              <h2>Mức dùng AI 7 ngày gần nhất</h2>
            </div>
            <div className="table-wrap">
              <table className="t">
                <thead>
                  <tr>
                    <th scope="col">Ngày</th>
                    <th scope="col">Loại</th>
                    <th scope="col">Số lần gọi</th>
                    <th scope="col">Lỗi</th>
                    <th scope="col">Thời gian trung bình</th>
                    <th scope="col">Token</th>
                  </tr>
                </thead>
                <tbody>
                  {s.usage.map((u) => (
                    <tr key={`${u.day}-${u.kind}`}>
                      <td className="num">{u.day.split('-').reverse().join('/')}</td>
                      <td>{KIND[u.kind]}</td>
                      <td className="num">{u.calls}</td>
                      <td className="num">{u.errors}</td>
                      <td className="num">{(u.avgLatencyMs / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} giây</td>
                      <td className="num">{u.tokens.toLocaleString('vi-VN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!s.usage.length && (
              <p className="muted" style={{ padding: 22 }}>
                Chưa có lượt gọi dịch vụ AI nào trong 7 ngày qua.
              </p>
            )}
          </section>
        </>
      )}
    </>
  );
}
