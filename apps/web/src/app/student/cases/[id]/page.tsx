'use client';

import Link from 'next/link';
import { use, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, PlayCircle } from 'lucide-react';
import { SKILL_LABELS } from '@lab-fourt/shared';
import { Notice, PageHead } from '@/components/ui';
import { ApiRequestError } from '@/lib/api';
import { DIFFICULTY_LABELS, useCase, useStartSession } from '@/lib/sessions';
import { fmtDue, useMyAssignments } from '@/lib/assignments';
import { useMe } from '@/lib/auth';
import { hasWebGL2, roomImage } from '@/features/room/RoomView';

/** SCR-05 Trang chuẩn bị (FR-CASE-03, FR-SES-01, FR-SAFE-03) */
export default function PreparePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const c = useCase(id);
  const start = useStartSession();
  const [agreed, setAgreed] = useState(false);
  const me = useMe();
  const wanted = useSearchParams().get('bai');
  const mine = useMyAssignments();
  // Bài được giao còn mở của ca này: lấy theo đường dẫn, nếu không có thì lấy bài chưa nộp đầu tiên
  const assignment =
    me.data?.role === 'STUDENT'
      ? (mine.data ?? []).find((a) => a.caseId === id && a.status === 'OPEN' && (wanted ? a.id === wanted : !a.submission))
      : undefined;

  const running = start.error instanceof ApiRequestError && start.error.status === 409 ? (start.error.data?.sessionId as string | undefined) : undefined;

  const begin = () =>
    start.mutate(
      { caseId: id, acceptedRules: true, renderMode: hasWebGL2() ? 'THREE_D' : 'LITE_2D', assignmentId: assignment?.id },
      { onSuccess: ({ id: sessionId }) => router.push(`/session/${sessionId}`) },
    );

  if (c.isError) {
    return (
      <Notice tone="danger" icon={AlertTriangle}>
        Không tìm thấy ca này hoặc ca chưa được xuất bản. <Link href="/student/cases">Về thư viện ca</Link>
      </Notice>
    );
  }
  if (!c.data) return <p className="muted">Đang tải...</p>;
  const d = c.data;

  return (
    <>
      <Link className="crumb" href="/student/cases">
        ‹ Thư viện ca
      </Link>
      <PageHead title={d.title} sub={d.summary} />
      <div className="prep-hero" role="img" aria-label={`Thân chủ ${d.clientName} trong phòng tham vấn`} style={{ backgroundImage: `url(${roomImage(d.avatarKey)})` }} />
      <div className="grid-2">
        <div className="stack lg">
          <section className="panel stack">
            <h2>Bối cảnh</h2>
            <p>{d.background}</p>
            {d.mainIssue && <p>{d.mainIssue}</p>}
            <div className="row">
              <span className="badge brand">
                Thân chủ {d.clientName}
                {d.clientAge ? `, ${d.clientAge} tuổi` : ''}
              </span>
              <span className="badge">{DIFFICULTY_LABELS[d.difficulty] ?? `Mức ${d.difficulty}`}</span>
              <span className="badge">Tối đa {d.maxDurationMin} phút</span>
            </div>
          </section>
          <section className="panel stack">
            <h2>Mục tiêu học tập</h2>
            <ul className="clean">
              {d.learningObjectives.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
            <div className="chips">
              {d.skills.map((s) => (
                <span key={s} className="tag">
                  {SKILL_LABELS[s]}
                </span>
              ))}
            </div>
          </section>
          <section className="panel stack">
            <h2>Vai trò của bạn</h2>
            <p>
              Bạn là người tham vấn trong buổi gặp đầu tiên. Hãy lắng nghe, đặt câu hỏi và giúp thân chủ tự làm rõ điều họ đang gặp
              phải. Thân chủ có thể do dự hoặc chưa sẵn sàng chia sẻ ngay.
            </p>
          </section>
        </div>
        <aside className="stack">
          <section className="panel stack">
            <h2>Trước khi bắt đầu</h2>
            <Notice tone="warn" icon={AlertTriangle}>
              Đây là môi trường mô phỏng phục vụ học tập. Thân chủ do AI đóng vai, không phải người thật và không phải buổi tham vấn
              thật.
            </Notice>
            <ul className="clean small">
              <li>Bạn có thể nói qua micro hoặc nhập văn bản.</li>
              <li>Thân chủ trả lời bằng chữ trên màn hình.</li>
              <li>Hệ thống lưu lời nói của bạn dưới dạng văn bản, không lưu âm thanh.</li>
              <li>Phiên tự kết thúc và lưu lại khi hết {d.maxDurationMin} phút.</li>
              <li>Bạn xem và xóa được phiên của mình trong 14 ngày.</li>
              {assignment && (
                <li>
                  Ca này thuộc bài <b style={{ fontWeight: 600 }}>{assignment.title}</b>, hạn {fmtDue(assignment.dueAt)}. Sau phiên, hãy viết
                  phản tư rồi nộp cho giảng viên.
                </li>
              )}
            </ul>
            {!d.contentReviewed && <p className="small muted">Nội dung ca đang chờ giảng viên đối chiếu giáo trình.</p>}
            <label className="check">
              <input id="agree" type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
              <span>Tôi đã đọc và hiểu quy tắc mô phỏng.</span>
            </label>
            <button type="button" className="btn primary lg" disabled={!agreed || start.isPending} onClick={begin}>
              <PlayCircle size={17} aria-hidden />
              {start.isPending ? 'Đang mở phòng...' : 'Bắt đầu phiên'}
            </button>
            {!agreed && <p className="small muted">Đánh dấu ô xác nhận để bắt đầu.</p>}
            {running && (
              <Notice tone="warn" icon={AlertTriangle}>
                <span>Bạn đang có một phiên chưa kết thúc. </span>
                <Link href={`/session/${running}`}>Quay lại phiên đó</Link>
              </Notice>
            )}
            {start.error && !running && (
              <Notice tone="danger" icon={AlertTriangle}>
                {start.error instanceof ApiRequestError ? start.error.message : 'Không bắt đầu được phiên, hãy thử lại.'}
              </Notice>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
