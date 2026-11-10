'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Archive, ArchiveRestore, Copy, FilePlus2, Info } from 'lucide-react';
import type { AuthoringCaseRow } from '@lab-fourt/shared';
import { Modal } from '@/components/modal';
import { Notice, PageHead } from '@/components/ui';
import { useArchiveCase, useAuthoringCases, useCopyCase } from '@/lib/case-authoring';
import { DIFFICULTY_LABELS, fmtDateTime } from '@/lib/sessions';

const STATUS = {
  PUBLISHED: { label: 'Đã xuất bản', tone: 'ok' },
  DRAFT: { label: 'Nháp', tone: 'warn' },
  ARCHIVED: { label: 'Đã lưu trữ', tone: '' },
} as const;

/** Danh sách ca của giảng viên (FR-CASE-04, FR-CASE-07, FR-CASE-10) */
export default function LecturerCasesPage() {
  const router = useRouter();
  const cases = useAuthoringCases();
  const copy = useCopyCase();
  const archive = useArchiveCase();
  const [target, setTarget] = useState<AuthoringCaseRow | null>(null);

  return (
    <>
      <PageHead
        title="Ca mô phỏng"
        sub="Sinh viên chỉ thấy ca đã xuất bản. Sửa ca đã xuất bản sẽ tạo bản nháp mới, không làm thay đổi các phiên đã thực hành."
        actions={
          <Link className="btn primary" href="/lecturer/cases/new">
            <FilePlus2 size={17} aria-hidden />
            Soạn ca mới
          </Link>
        }
      />
      <section className="panel flush">
        {cases.isPending && (
          <p className="muted" style={{ padding: 22 }}>
            Đang tải...
          </p>
        )}
        {!!cases.data?.length && (
          <div className="table-wrap">
            <table className="t">
              <thead>
                <tr>
                  <th scope="col">Tên ca</th>
                  <th scope="col">Độ khó</th>
                  <th scope="col">Phiên bản</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Thẩm định nội dung</th>
                  <th scope="col">Cập nhật</th>
                  <th scope="col" className="act">
                    <span className="sr-only">Thao tác</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {cases.data.map((c) => (
                  <tr key={c.id}>
                    <td>
                      {c.title}
                      <div className="small muted">{c.ownerName}</div>
                    </td>
                    <td>{DIFFICULTY_LABELS[c.difficulty]}</td>
                    <td className="num">
                      {c.publishedVersionNo ? `v${c.publishedVersionNo}` : 'Chưa có'}
                      {c.hasDraft && c.publishedVersionNo && <span className="small muted"> + bản nháp</span>}
                    </td>
                    <td>
                      <span className={`badge ${STATUS[c.status].tone}`}>{STATUS[c.status].label}</span>
                    </td>
                    <td>
                      <span className={`badge ${c.contentReviewed ? 'ok' : ''}`}>{c.contentReviewed ? 'Đã đối chiếu' : 'Chờ đối chiếu'}</span>
                    </td>
                    <td className="num">{fmtDateTime(c.updatedAt)}</td>
                    <td className="act">
                      <Link className="btn ghost sm" href={`/lecturer/cases/${c.id}`}>
                        Sửa
                      </Link>
                      <button
                        type="button"
                        className="btn ghost sm"
                        aria-label={`Sao chép ${c.title}`}
                        disabled={copy.isPending}
                        onClick={() => copy.mutate(c.id, { onSuccess: (d) => router.push(`/lecturer/cases/${d.id}`) })}
                      >
                        <Copy size={15} aria-hidden />
                      </button>
                      {c.status === 'ARCHIVED' ? (
                        <button
                          type="button"
                          className="btn ghost sm"
                          aria-label={`Khôi phục ${c.title}`}
                          onClick={() => archive.mutate({ id: c.id, archived: false })}
                        >
                          <ArchiveRestore size={15} aria-hidden />
                        </button>
                      ) : (
                        <button type="button" className="btn ghost sm" aria-label={`Lưu trữ ${c.title}`} onClick={() => setTarget(c)}>
                          <Archive size={15} aria-hidden />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <Notice tone="neutral" icon={Info}>
        <span className="small">
          Nội dung ca cần được giảng viên đối chiếu với giáo trình trước khi nghiệm thu (OI-02). Đánh dấu đã đối chiếu ngay trong trang soạn ca.
        </span>
      </Notice>
      {target && (
        <Modal
          title="Lưu trữ ca này?"
          onClose={() => setTarget(null)}
          footer={
            <>
              <button type="button" className="btn secondary" onClick={() => setTarget(null)}>
                Hủy
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={() => archive.mutate({ id: target.id, archived: true }, { onSuccess: () => setTarget(null) })}
              >
                Lưu trữ
              </button>
            </>
          }
        >
          <p>Sinh viên sẽ không thấy ca {target.title} nữa. Các phiên và bài đã nộp vẫn được giữ nguyên, bạn có thể khôi phục ca sau.</p>
        </Modal>
      )}
    </>
  );
}
