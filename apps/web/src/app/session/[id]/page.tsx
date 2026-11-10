'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { ROLE_HOME } from '@lab-fourt/shared';
import { Leaves, Notice } from '@/components/ui';
import { ApiRequestError } from '@/lib/api';
import { useMe } from '@/lib/auth';
import { endSession, sessionKey, useSession } from '@/lib/sessions';
import { RoomScreen } from '@/features/session/RoomScreen';

/** Phòng tham vấn chiếm toàn màn hình nên nằm ngoài khung có thanh bên */
export default function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const qc = useQueryClient();
  const me = useMe();
  const session = useSession(id);
  const user = me.data;

  useEffect(() => {
    if (me.isPending) return;
    if (!user) router.replace('/login');
    else if (user.mustChangePassword) router.replace('/change-password');
    else if (user.role === 'ADMIN') router.replace(ROLE_HOME.ADMIN);
  }, [me.isPending, user, router]);

  useEffect(() => {
    if (session.data?.status === 'ENDED') router.replace(`/student/history/${id}`);
  }, [session.data?.status, id, router]);

  if (session.isError) {
    const notFound = session.error instanceof ApiRequestError && session.error.status === 404;
    return (
      <div className="page">
        <Leaves />
        <Notice tone="danger" icon={AlertTriangle}>
          {notFound ? 'Không tìm thấy phiên thực hành này.' : 'Không tải được phiên. Hãy kiểm tra mạng rồi tải lại trang.'}
        </Notice>
      </div>
    );
  }
  if (!session.data || !user || session.data.status === 'ENDED') {
    return (
      <div className="room" aria-busy="true">
        <div className="stage" />
      </div>
    );
  }

  // Phiên bị bỏ dở chỉ có thể kết thúc (docs/srs/04 mục 4.1)
  if (session.data.status === 'ABANDONED') {
    return (
      <div className="page">
        <Leaves />
        <section className="panel stack">
          <h2>Phiên đã tạm dừng do lâu không hoạt động</h2>
          <p>Hội thoại của bạn vẫn được giữ. Hãy kết thúc phiên để lưu lại và xem tóm tắt.</p>
          <div>
            <button
              type="button"
              className="btn primary"
              onClick={async () => {
                await endSession(id).catch(() => undefined);
                router.replace(`/student/history/${id}`);
              }}
            >
              Kết thúc phiên
            </button>
          </div>
        </section>
      </div>
    );
  }

  return <RoomScreen session={session.data} onResync={() => void qc.invalidateQueries({ queryKey: sessionKey(id) })} />;
}
