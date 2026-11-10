'use client';

import Link from 'next/link';
import { use } from 'react';
import { AlertTriangle, FileText, Info, PencilLine } from 'lucide-react';
import { SKILL_LABELS } from '@lab-fourt/shared';
import { Meter } from '@/components/meter';
import { Notice, PageHead } from '@/components/ui';
import { ApiRequestError } from '@/lib/api';
import { useReport } from '@/lib/reports';
import { fmtDateTime } from '@/lib/sessions';

/** SCR-07 Báo cáo sau phiên (FR-RPT-01 đến FR-RPT-07, FR-SAFE-03) */
export default function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const report = useReport(id);

  if (report.isError) {
    const running = report.error instanceof ApiRequestError && report.error.status === 409;
    return (
      <Notice tone={running ? 'warn' : 'danger'} icon={AlertTriangle}>
        {running ? (
          <>
            Phiên chưa kết thúc nên chưa có báo cáo. <Link href={`/session/${id}`}>Quay lại phiên</Link>
          </>
        ) : (
          <>
            Không tìm thấy báo cáo này. <Link href="/student/history">Về lịch sử thực hành</Link>
          </>
        )}
      </Notice>
    );
  }
  if (!report.data) return <p className="muted">Đang tải...</p>;
  const r = report.data;
  const minutes = r.endedAt ? Math.max(1, Math.round((new Date(r.endedAt).getTime() - new Date(r.startedAt).getTime()) / 60_000)) : null;
  const back = (
    <Link className="crumb" href="/student/history">
      ‹ Lịch sử thực hành
    </Link>
  );
  const transcriptLink = (
    <Link className="btn secondary" href={`/student/history/${id}/transcript`}>
      <FileText size={17} aria-hidden />
      Xem transcript
    </Link>
  );

  if (r.status === 'PENDING' || r.status === 'PROCESSING') {
    return (
      <>
        {back}
        <PageHead
          title="Đang tạo báo cáo"
          sub="Quá trình này diễn ra ở nền. Bạn có thể rời trang, báo cáo sẽ nằm trong Lịch sử thực hành."
          actions={transcriptLink}
        />
        <section className="panel stack" aria-busy="true">
          <div className="typing" aria-hidden>
            <i />
            <i />
            <i />
          </div>
          <p className="muted">Hệ thống đang đọc lại hội thoại và đối chiếu với rubric.</p>
        </section>
      </>
    );
  }

  if (r.status === 'FAILED') {
    return (
      <>
        {back}
        <PageHead title={`Báo cáo: ${r.caseTitle}`} actions={transcriptLink} />
        <Notice tone="warn" icon={AlertTriangle}>
          Chưa tạo được báo cáo cho phiên này. Hội thoại vẫn được lưu đầy đủ. Quản trị viên đã được ghi nhận và có thể chạy lại.
        </Notice>
      </>
    );
  }

  return (
    <>
      {back}
      <PageHead
        title={`Báo cáo: ${r.caseTitle}`}
        sub={`Phiên ${fmtDateTime(r.startedAt)}${minutes ? `, ${minutes} phút` : ''}, ${r.studentTurns} lượt của bạn.`}
        actions={
          <>
            {transcriptLink}
            <Link className="btn primary" href={`/student/history/${id}/reflection`}>
              <PencilLine size={17} aria-hidden />
              Viết phản tư
            </Link>
          </>
        }
      />
      {/* FR-RPT-07, FR-SAFE-03 */}
      <Notice icon={Info}>
        Đây là đề xuất của AI để bạn tự đánh giá, không phải điểm học phần và không phải kết luận về năng lực nghề nghiệp. Phiên diễn
        ra trong môi trường mô phỏng.
      </Notice>
      <div className="grid-2">
        <section className="panel stack">
          <h2>Đánh giá theo kỹ năng</h2>
          <div>
            {r.scores.map((sc) => (
              <div className="skill" key={sc.skill}>
                <div className="skill-top">
                  <h3>{SKILL_LABELS[sc.skill]}</h3>
                  <Meter level={sc.level} />
                </div>
                {sc.rationale && <p className="small muted">{sc.rationale}</p>}
                {sc.evidence.map((e, i) =>
                  e.seq !== null ? (
                    <Link className="quote" key={i} href={`/student/history/${id}/transcript?luot=${e.seq}`}>
                      <span className="seq num">Lượt {e.seq}</span>
                      <span>{e.quote}</span>
                    </Link>
                  ) : null,
                )}
                {sc.needsReview && (
                  <p className="small" style={{ color: 'var(--warn)' }}>
                    Có dẫn chứng không khớp hội thoại nên đã bị loại. Kỹ năng này cần giảng viên xem lại.
                  </p>
                )}
                {sc.lecturerLevel !== null && (
                  <p className="small">
                    <b style={{ fontWeight: 500 }}>Giảng viên đánh giá:</b> mức {sc.lecturerLevel}
                    {sc.lecturerNote ? `. ${sc.lecturerNote}` : ''}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
        <aside className="stack lg">
          <section className="panel stack">
            <h2>Tóm tắt phiên</h2>
            <p className="small">{r.summary}</p>
          </section>
          {r.lecturerComment && (
            <section className="panel stack">
              <h2>Nhận xét của giảng viên</h2>
              <p className="small">{r.lecturerComment}</p>
            </section>
          )}
          <section className="panel stack">
            <h2>Điểm làm tốt</h2>
            <ul className="clean small">
              {r.strengths.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </section>
          <section className="panel stack">
            <h2>Điểm cần cải thiện</h2>
            {r.improvements.map((x) => (
              <div key={x.point} className="small">
                {x.point}
                {x.alternativePhrase && <div className="alt">{x.alternativePhrase}</div>}
              </div>
            ))}
          </section>
          <section className="panel stack">
            <h2>Mục tiêu lần sau</h2>
            <ul className="clean small">
              {r.practiceGoals.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </section>
          {(r.limitationNote || r.hasLowConfidence) && (
            <Notice tone="neutral" icon={AlertTriangle}>
              <span className="small">
                {r.limitationNote}
                {r.hasLowConfidence ? ' Một số lượt có độ tin cậy nhận dạng giọng nói thấp, văn bản có thể khác lời nói thật.' : ''}
              </span>
            </Notice>
          )}
        </aside>
      </div>
    </>
  );
}
