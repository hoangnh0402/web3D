'use client';

import { Info } from 'lucide-react';
import { Notice, PageHead } from '@/components/ui';
import { useMe } from '@/lib/auth';

export default function LecturerHome() {
  const me = useMe();
  return (
    <>
      <PageHead title={`Xin chào, ${me.data?.fullName ?? ''}`} sub="Trang chủ giảng viên" />
      <Notice tone="neutral" icon={Info}>
        Soạn ca, giao bài, tiến độ lớp và xem xét bài nộp sẽ có ở các bản tiếp theo.
      </Notice>
    </>
  );
}
