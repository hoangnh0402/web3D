'use client';

import Link from 'next/link';
import { Box, Info } from 'lucide-react';
import { Notice, PageHead } from '@/components/ui';
import { useMe } from '@/lib/auth';

export default function StudentHome() {
  const me = useMe();
  return (
    <>
      <PageHead title={`Xin chào, ${me.data?.fullName ?? ''}`} sub="Trang chủ sinh viên" />
      <Notice tone="neutral" icon={Info}>
        Thư viện ca, phiên thực hành và báo cáo sẽ có ở các bản tiếp theo. Bạn có thể xem thử phòng tham vấn 3D.
      </Notice>
      <div className="row">
        <Link className="btn primary" href="/student/room-preview">
          <Box size={17} aria-hidden />
          Xem thử phòng 3D
        </Link>
      </div>
    </>
  );
}
