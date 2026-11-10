'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { caseEditorSchema } from '@lab-fourt/shared';
import { PageHead } from '@/components/ui';
import { ApiRequestError } from '@/lib/api';
import { useCreateCase } from '@/lib/case-authoring';
import { CaseEditor } from '@/features/cases/CaseEditor';

const EMPTY = caseEditorSchema.parse({ title: 'Ca mới' });

/** SCR-12 Soạn ca mới */
export default function NewCasePage() {
  const router = useRouter();
  const create = useCreateCase();
  return (
    <>
      <Link className="crumb" href="/lecturer/cases">
        ‹ Ca mô phỏng
      </Link>
      <PageHead title="Soạn ca mới" sub="Lưu nháp bất cứ lúc nào. Xuất bản khi đã điền đủ 8 thành phần." />
      <CaseEditor
        initial={EMPTY}
        saving={create.isPending}
        error={create.error instanceof ApiRequestError ? create.error.message : create.error ? 'Chưa lưu được, hãy thử lại.' : null}
        onSave={(d) => create.mutate(d, { onSuccess: (c) => router.replace(`/lecturer/cases/${c.id}`) })}
      />
    </>
  );
}
