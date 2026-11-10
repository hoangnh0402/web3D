'use client';

import Link from 'next/link';
import { CalendarClock, Check, PencilLine, Play, PlayCircle } from 'lucide-react';
import { DEFAULT_REFLECTION_QUESTIONS } from '@lab-fourt/shared';
import { PageHead } from '@/components/ui';
import { useMe } from '@/lib/auth';
import { DIFFICULTY_LABELS, fmtDateTime, useActiveSession, useCases, useSessions } from '@/lib/sessions';
import { useReport } from '@/lib/reports';
import { fmtDue, useMyAssignments } from '@/lib/assignments';

const firstName = (full: string) => full.trim().split(/\s+/).at(-1) ?? full;

/** Câu hỏi phản tư từ báo cáo của phiên gần nhất đã kết thúc, cùng bố cục với prototype */
const ReflectionCard = ({ session }: { session?: { id: string; caseTitle: string; endedAt: string | null } }) => {
  const report = useReport(session?.id ?? '', !!session);
  const ready = report.data?.status === 'READY';
  const question = ready ? report.data?.reflectionQuestions[0] : session ? DEFAULT_REFLECTION_QUESTIONS[0] : undefined;
  const goals = ready ? (report.data?.practiceGoals ?? []).slice(0, 2) : [];
  return (
    <section className="panel lift reflect-card">
      <div className="panel-head">
        <h2>Câu hỏi phản tư</h2>
        {session?.endedAt && (
          <span className="small muted">
            Từ phiên {session.caseTitle}, {fmtDateTime(session.endedAt).split(' ')[1]?.slice(0, 5) ?? ''}
          </span>
        )}
      </div>
      <blockquote className="prompt">{question ?? 'Hoàn thành phiên đầu tiên để nhận câu hỏi phản tư.'}</blockquote>
      {!!goals.length && (
        <div className="stack" style={{ gap: 6 }}>
          <h3>Mục tiêu lần sau</h3>
          <ul className="clean small">
            {goals.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </div>
      )}
      {session && (
        <div className="foot">
          <Link className="btn secondary" href={`/student/history/${session.id}/reflection`}>
            <PencilLine size={17} aria-hidden />
            Viết phản tư
          </Link>
        </div>
      )}
    </section>
  );
};

/** SCR-03 Trang chủ sinh viên: phiên đang dở, bài được giao (FR-ASG-02), ca thực hành */
export default function StudentHome() {
  const me = useMe();
  const active = useActiveSession();
  const cases = useCases();
  const assignments = useMyAssignments();
  const todo = (assignments.data ?? []).filter((a) => a.status === 'OPEN' && !a.submission);
  const nextAssignment = todo[0];
  const next = cases.data?.find((c) => c.practiceStatus === 'NOT_STARTED') ?? cases.data?.[0];
  const sessions = useSessions();
  const lastEnded = sessions.data?.find((x) => x.status === 'ENDED');

  return (
    <>
      <PageHead
        title="Trang chủ"
        sub={`Chào ${firstName(me.data?.fullName ?? '')}. Bạn có thể thực hành bất cứ lúc nào, chỉ bạn và giảng viên được phân quyền xem bài nộp.`}
      />
      {active.data ? (
        <section className="hero-card" aria-label="Phiên đang dở">
          <div>
            <span className="kicker">Phiên đang dở</span>
            <h2>Bạn còn một phiên chưa kết thúc</h2>
            <p>Hội thoại đã được lưu. Quay lại để tiếp tục hoặc kết thúc phiên.</p>
            <div className="actions">
              <Link className="btn primary lg" href={`/session/${active.data.id}`}>
                <PlayCircle size={17} aria-hidden />
                Quay lại phiên
              </Link>
            </div>
          </div>
        </section>
      ) : nextAssignment ? (
        <section className="hero-card" aria-label="Bài được giao">
          <div>
            <span className="kicker">Bài được giao</span>
            <h2>{nextAssignment.title}</h2>
            <p>
              Phiên tối đa {nextAssignment.maxDurationMin} phút với thân chủ {nextAssignment.clientName}
            </p>
            <div className="meta">
              <span>
                <CalendarClock size={15} aria-hidden />
                Hạn {fmtDue(nextAssignment.dueAt)}
              </span>
            </div>
            <div className="actions">
              <Link
                className="btn primary lg"
                href={`/student/cases/${nextAssignment.caseId}?bai=${nextAssignment.id}`}
              >
                <PlayCircle size={17} aria-hidden />
                Bắt đầu thực hành
              </Link>
            </div>
          </div>
        </section>
      ) : (
        next && (
          <section className="hero-card" aria-label="Gợi ý thực hành">
            <div>
              <span className="kicker">Gợi ý hôm nay</span>
              <h2>{next.title}</h2>
              <p>
                Phiên tối đa {next.maxDurationMin} phút với thân chủ {next.clientName}
              </p>
              <div className="actions">
                <Link className="btn primary lg" href={`/student/cases/${next.id}`}>
                  <PlayCircle size={17} aria-hidden />
                  Bắt đầu thực hành
                </Link>
              </div>
            </div>
          </section>
        )
      )}
      {!!assignments.data?.length && (
        <section className="panel lift stack" aria-label="Bài được giao">
          <h2>Bài được giao</h2>
          <div>
            {assignments.data.map((a) => (
              <div className="list-row" key={a.id}>
                <Link
                  className="play"
                  aria-label={`Chuẩn bị ${a.title}`}
                  href={`/student/cases/${a.caseId}?bai=${a.id}`}
                >
                  <Play size={16} fill="currentColor" aria-hidden />
                </Link>
                <div className="grow">
                  <b>{a.title}</b>
                  <div className="small muted">
                    {a.caseTitle}, hạn {fmtDue(a.dueAt)}
                  </div>
                </div>
                {a.submission ? (
                  <span className="badge ok">
                    <Check size={13} aria-hidden />
                    {a.submission.isLate ? 'Đã nộp trễ' : 'Đã nộp'}
                  </span>
                ) : a.status === 'CLOSED' ? (
                  <span className="badge">Đã đóng</span>
                ) : (
                  <span className="badge brand">Chưa nộp</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
      <div className="grid-2-eq">
        <ReflectionCard session={lastEnded} />
        <section className="panel lift stack">
          <div className="panel-head">
            <h2>Ca thực hành</h2>
            <Link className="btn ghost sm" href="/student/cases">
              Xem tất cả
            </Link>
          </div>
          {cases.isPending && <p className="muted">Đang tải...</p>}
          {cases.data && !cases.data.length && <p className="muted">Chưa có ca nào được xuất bản.</p>}
          <div>
            {cases.data?.map((c) => (
              <div className="list-row" key={c.id}>
                <Link className="play" aria-label={`Chuẩn bị ca ${c.title}`} href={`/student/cases/${c.id}`}>
                  <Play size={16} fill="currentColor" aria-hidden />
                </Link>
                <div className="grow">
                  <b>{c.title}</b>
                  <div className="small muted">
                    Thân chủ {c.clientName}, {c.maxDurationMin} phút
                  </div>
                </div>
                <span className="badge">{DIFFICULTY_LABELS[c.difficulty] ?? `Mức ${c.difficulty}`}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
