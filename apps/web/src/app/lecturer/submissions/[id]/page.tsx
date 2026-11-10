'use client';

import Link from 'next/link';
import { use, useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { SKILL_LABELS, SKILL_LEVELS, type SkillCode, type SubmissionReview } from '@lab-fourt/shared';
import { Meter } from '@/components/meter';
import { MsgLine } from '@/components/msg-line';
import { Notice, PageHead } from '@/components/ui';
import { ApiRequestError } from '@/lib/api';
import { useSaveReview, useSubmissionReview } from '@/lib/assignments';
import { fmtDateTime } from '@/lib/sessions';

/** Biểu mẫu khởi tạo một lần từ dữ liệu đã tải */
const ReviewForm = ({ id, data }: { id: string; data: SubmissionReview }) => {
  const save = useSaveReview(id);
  const [focus, setFocus] = useState<number | null>(null);
  const [comment, setComment] = useState(data.report.lecturerComment ?? '');
  const [levels, setLevels] = useState<Record<string, number | null>>(() =>
    Object.fromEntries(data.report.scores.map((s) => [s.skill, s.lecturerLevel])),
  );
  const [notes, setNotes] = useState<Record<string, string>>(() =>
    Object.fromEntries(data.report.scores.map((s) => [s.skill, s.lecturerNote ?? ''])),
  );
  const ready = data.report.status === 'READY';
  const store = () =>
    save.mutate({
      comment,
      scores: data.report.scores.map((s) => ({ skill: s.skill as SkillCode, level: levels[s.skill] ?? null, note: notes[s.skill] ?? '' })),
    });

  return (
    <>
      <PageHead
        title={data.studentName}
        sub={`${data.assignmentTitle}, nộp lúc ${fmtDateTime(data.submittedAt)}${data.isLate ? ' (trễ hạn)' : ''}.`}
        actions={
          <button type="button" className="btn primary" disabled={!ready || save.isPending} onClick={store}>
            {save.isPending ? 'Đang lưu...' : 'Lưu nhận xét'}
          </button>
        }
      />
      {!ready && (
        <Notice tone="warn" icon={AlertTriangle}>
          Báo cáo AI của phiên này chưa sẵn sàng nên chưa đánh giá được. Bạn vẫn đọc được transcript.
        </Notice>
      )}
      {save.error && (
        <Notice tone="danger" icon={AlertTriangle}>
          {save.error instanceof ApiRequestError ? save.error.message : 'Chưa lưu được, hãy thử lại.'}
        </Notice>
      )}
      {save.isSuccess && (
        <p className="small muted" role="status">
          <CheckCircle2 size={14} aria-hidden style={{ verticalAlign: -2, marginRight: 6 }} />
          Đã lưu nhận xét. Sinh viên sẽ thấy nhận xét kèm tên bạn và thời điểm.
        </p>
      )}
      <div className="review">
        <section className="panel stack">
          <h2>Transcript</h2>
          <div className="log">
            {data.messages.map((m) => (
              <MsgLine key={m.seq} m={m} focus={focus === m.seq} clientName={data.report.clientName} you="Sinh viên" />
            ))}
          </div>
        </section>
        <div className="stack lg">
          <section className="panel stack">
            <h2>Đánh giá theo kỹ năng</h2>
            <p className="small muted">Đề xuất của AI được giữ nguyên. Mức bạn chọn lưu riêng và hiển thị cho sinh viên.</p>
            <div>
              {data.report.scores.map((sc) => (
                <div className="skill" key={sc.skill}>
                  <h3>{SKILL_LABELS[sc.skill]}</h3>
                  <div className="compare">
                    <div>
                      <div className="small muted">AI đề xuất</div>
                      <Meter level={sc.level} compact />
                    </div>
                    <div className="field">
                      <label htmlFor={`lv-${sc.skill}`} className="small">
                        Giảng viên đánh giá
                      </label>
                      <select
                        id={`lv-${sc.skill}`}
                        className="select"
                        value={levels[sc.skill] ?? ''}
                        onChange={(e) => setLevels((l) => ({ ...l, [sc.skill]: e.target.value ? Number(e.target.value) : null }))}
                      >
                        <option value="">Chưa đánh giá</option>
                        {Object.entries(SKILL_LEVELS).map(([n, name]) => (
                          <option key={n} value={n}>
                            {n}. {name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {sc.needsReview && (
                    <p className="small" style={{ color: 'var(--warn)' }}>
                      Có dẫn chứng của AI không khớp hội thoại và đã bị loại.
                    </p>
                  )}
                  {sc.evidence.map((e, i) =>
                    e.seq !== null ? (
                      <button type="button" className="quote" key={i} onClick={() => setFocus(e.seq)}>
                        <span className="seq num">Lượt {e.seq}</span>
                        <span>{e.quote}</span>
                      </button>
                    ) : null,
                  )}
                  <label className="sr-only" htmlFor={`note-${sc.skill}`}>
                    Ghi chú cho {SKILL_LABELS[sc.skill]}
                  </label>
                  <input
                    id={`note-${sc.skill}`}
                    className="input"
                    placeholder="Ghi chú (không bắt buộc)"
                    maxLength={1000}
                    value={notes[sc.skill] ?? ''}
                    onChange={(e) => setNotes((n) => ({ ...n, [sc.skill]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          </section>
          {data.reflection && (
            <section className="panel stack">
              <h2>Phản tư của sinh viên</h2>
              {data.reflection.questions.map((q, i) => (
                <div key={q} className="small">
                  <b style={{ fontWeight: 600 }}>{q}</b>
                  <p>{data.reflection?.answers[i]}</p>
                </div>
              ))}
              <p className="small">
                <b style={{ fontWeight: 600 }}>Mục tiêu lần sau:</b> {data.reflection.nextGoal}
              </p>
            </section>
          )}
          <section className="panel stack">
            <label htmlFor="review-comment">
              <h2>Nhận xét chung</h2>
            </label>
            <textarea id="review-comment" className="textarea" maxLength={4000} value={comment} onChange={(e) => setComment(e.target.value)} />
            {data.reviewedAt && (
              <p className="small muted">
                Lần lưu gần nhất: {data.reviewedBy}, {fmtDateTime(data.reviewedAt)}
              </p>
            )}
          </section>
        </div>
      </div>
    </>
  );
};

/** SCR-15 Xem xét bài nộp (FR-LEC-02, FR-LEC-03) */
export default function SubmissionReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const review = useSubmissionReview(id);
  if (review.isError) {
    return (
      <Notice tone="danger" icon={AlertTriangle}>
        Không tìm thấy bài nộp trong phạm vi của bạn, hoặc sinh viên đã rút bài. <Link href="/lecturer">Về tổng quan</Link>
      </Notice>
    );
  }
  if (!review.data) return <p className="muted">Đang tải...</p>;
  return (
    <>
      <Link className="crumb" href="/lecturer">
        ‹ Tổng quan
      </Link>
      <ReviewForm id={id} data={review.data} />
    </>
  );
}
