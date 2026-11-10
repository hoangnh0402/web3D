'use client';

import Link from 'next/link';
import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { ReflectionDto, SessionDetail } from '@lab-fourt/shared';
import { Notice, PageHead } from '@/components/ui';
import { ApiRequestError } from '@/lib/api';
import { useReflection, useReport, useSaveReflection } from '@/lib/reports';
import { fmtDue, useSubmit } from '@/lib/assignments';
import { fmtDateTime, useSession } from '@/lib/sessions';

/** Biểu mẫu tách riêng để khởi tạo từ dữ liệu đã lưu một lần, không cần đồng bộ bằng effect */
const ReflectionForm = ({
  id,
  initial,
  hint,
  session,
}: {
  id: string;
  initial: ReflectionDto;
  hint?: string;
  session?: SessionDetail;
}) => {
  const router = useRouter();
  const save = useSaveReflection(id);
  const submit = useSubmit(id);
  const assignment = session?.assignment ?? null;
  const handedIn = session?.submission?.status === 'SUBMITTED' || submit.isSuccess;
  const [answers, setAnswers] = useState(() => initial.questions.map((_, i) => initial.answers[i] ?? ''));
  const [goal, setGoal] = useState(initial.nextGoal);
  const [saved, setSaved] = useState<'draft' | 'done' | null>(null);
  const complete = answers.every((a) => a.trim()) && goal.trim().length > 0;
  const submitted = !!(save.data?.submittedAt ?? initial.submittedAt);

  const store = (done: boolean) =>
    save.mutate(
      { answers, nextGoal: goal, submit: done },
      {
        onSuccess: () => {
          setSaved(done ? 'done' : 'draft');
          if (!done) return;
          // Bài được giao chỉ nộp được khi đã có phản tư (FR-REF-02), nên nộp ngay sau khi hoàn thành
          if (assignment && !handedIn) submit.mutate(assignment.id);
          else router.push('/student/history');
        },
      },
    );

  return (
    <section className="panel stack lg">
      {initial.questions.map((q, i) => (
        <div className="field" key={q}>
          <label htmlFor={`ref-${i}`}>{q}</label>
          <textarea
            id={`ref-${i}`}
            className="textarea"
            maxLength={4000}
            value={answers[i] ?? ''}
            onChange={(e) => setAnswers((a) => a.map((x, k) => (k === i ? e.target.value : x)))}
          />
        </div>
      ))}
      <div className="field">
        <label htmlFor="ref-goal">Mục tiêu luyện tập cho lần sau</label>
        <textarea id="ref-goal" className="textarea" maxLength={4000} value={goal} placeholder={hint} onChange={(e) => setGoal(e.target.value)} />
      </div>
      {submit.error && (
        <Notice tone="danger" icon={AlertTriangle}>
          {submit.error instanceof ApiRequestError ? submit.error.message : 'Chưa nộp được bài, hãy thử lại.'}
        </Notice>
      )}
      {handedIn && (
        <p className="small" role="status">
          <CheckCircle2 size={14} aria-hidden style={{ verticalAlign: -2, marginRight: 6 }} />
          Đã nộp cho giảng viên{session?.submission?.isLate || submit.data?.submission?.isLate ? ' (trễ hạn)' : ''}.
        </p>
      )}
      {save.error && (
        <Notice tone="danger" icon={AlertTriangle}>
          {save.error instanceof ApiRequestError ? save.error.message : 'Chưa lưu được, hãy thử lại.'}
        </Notice>
      )}
      {saved === 'draft' && (
        <p className="small muted" role="status">
          <CheckCircle2 size={14} aria-hidden style={{ verticalAlign: -2, marginRight: 6 }} />
          Đã lưu nháp
        </p>
      )}
      <div className="row">
        <button type="button" className="btn secondary" disabled={save.isPending} onClick={() => store(false)}>
          Lưu nháp
        </button>
        <button type="button" className="btn primary" disabled={!complete || save.isPending || submit.isPending} onClick={() => store(true)}>
          {assignment && !handedIn ? 'Hoàn thành và nộp bài' : submitted ? 'Cập nhật phản tư' : 'Hoàn thành'}
        </button>
      </div>
      {!complete && <p className="small muted">Trả lời đủ các câu hỏi và mục tiêu lần sau để hoàn thành.</p>}
    </section>
  );
};

/** SCR-09 Phản tư và nộp bài (FR-REF-01, FR-REF-02, FR-ASG-04) */
export default function ReflectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const reflection = useReflection(id);
  const report = useReport(id);
  const session = useSession(id);
  const improvements = report.data?.status === 'READY' ? report.data.improvements : [];

  return (
    <>
      <Link className="crumb" href={`/student/history/${id}`}>
        ‹ Báo cáo
      </Link>
      <PageHead title="Phản tư" sub="Viết cho chính bạn. Với bài được giao, giảng viên phụ trách sẽ đọc phần này." />
      {reflection.isError && (
        <Notice tone="danger" icon={AlertTriangle}>
          Không tải được phần phản tư của phiên này.
        </Notice>
      )}
      {reflection.data && (
        <div className="grid-2">
          <ReflectionForm id={id} initial={reflection.data} hint={report.data?.practiceGoals[0]} session={session.data} />
          <aside className="panel stack">
            <h2>Gợi ý từ báo cáo</h2>
            {improvements.length ? (
              <ul className="clean small">
                {improvements.map((i) => (
                  <li key={i.point}>{i.point}</li>
                ))}
              </ul>
            ) : (
              <p className="small muted">Báo cáo chưa sẵn sàng. Bạn vẫn có thể viết phản tư trước.</p>
            )}
            {session.data?.assignment && (
              <p className="small">
                Phiên thuộc bài <b style={{ fontWeight: 600 }}>{session.data.assignment.title}</b>, hạn {fmtDue(session.data.assignment.dueAt)}.
                {session.data.submission?.status === 'SUBMITTED' && ` Đã nộp lúc ${fmtDateTime(session.data.submission.submittedAt)}.`}
              </p>
            )}
            {reflection.data.submittedAt && (
              <p className="small muted">Đã hoàn thành lúc {new Date(reflection.data.submittedAt).toLocaleString('vi-VN')}.</p>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
