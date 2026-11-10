'use client';

import Link from 'next/link';
import { use } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Notice, PageHead } from '@/components/ui';
import { ApiRequestError } from '@/lib/api';
import { useAuthoringCase, usePublishCase, useSaveCase } from '@/lib/case-authoring';
import { fmtDateTime } from '@/lib/sessions';
import { CaseEditor } from '@/features/cases/CaseEditor';

const message = (err: unknown) => (err instanceof ApiRequestError ? err.message : err ? 'Thao tác chưa thành công, hãy thử lại.' : null);

/** SCR-12 Sửa ca, lưu nháp và xuất bản phiên bản mới (FR-CASE-04 đến FR-CASE-08) */
export default function EditCasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const c = useAuthoringCase(id);
  const save = useSaveCase(id);
  const publish = usePublishCase(id);

  if (c.isError) {
    return (
      <Notice tone="danger" icon={AlertTriangle}>
        Không tìm thấy ca. <Link href="/lecturer/cases">Về danh sách ca</Link>
      </Notice>
    );
  }
  if (!c.data) return <p className="muted">Đang tải...</p>;
  const x = c.data;
  const status = [
    x.status === 'ARCHIVED' ? 'Đã lưu trữ' : x.publishedVersionNo ? `Đang dùng phiên bản ${x.publishedVersionNo}` : 'Chưa xuất bản',
    x.draftVersionNo ? `bản nháp phiên bản ${x.draftVersionNo}` : null,
    x.publishedAt ? `xuất bản lúc ${fmtDateTime(x.publishedAt)}` : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <>
      <Link className="crumb" href="/lecturer/cases">
        ‹ Ca mô phỏng
      </Link>
      <PageHead
        title={x.data.title}
        sub="Xuất bản tạo một phiên bản không đổi. Phiên đã thực hành vẫn gắn với phiên bản cũ."
      />
      {x.status === 'ARCHIVED' && (
        <Notice tone="warn" icon={AlertTriangle}>
          Ca đang lưu trữ. Hãy khôi phục trong danh sách ca trước khi sửa.
        </Notice>
      )}
      {/* key theo phiên bản: lưu xong thì biểu mẫu nhận lại dữ liệu mới từ máy chủ */}
      <CaseEditor
        key={`${x.draftVersionNo ?? 'p'}-${x.publishedVersionNo ?? 0}-${x.status}`}
        initial={x.data}
        status={status}
        saving={save.isPending}
        publishing={publish.isPending}
        error={message(save.error) ?? message(publish.error)}
        onSave={(d) => save.mutate(d)}
        hasDraft={!!x.draftVersionNo}
        onPublish={(d, dirty) => (dirty ? save.mutate(d, { onSuccess: () => publish.mutate() }) : publish.mutate())}
      />
    </>
  );
}
