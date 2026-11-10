'use client';

import Link from 'next/link';
import { useState } from 'react';
import { SKILL_CODES, SKILL_LABELS, type CaseSummary, type PracticeStatus, type SkillCode } from '@lab-fourt/shared';
import { PageHead } from '@/components/ui';
import { DIFFICULTY_LABELS, useCases } from '@/lib/sessions';
import { roomImage } from '@/features/room/RoomView';

const STATUS: Record<PracticeStatus, { label: string; tone: string }> = {
  NOT_STARTED: { label: 'Chưa thực hành', tone: '' },
  IN_PROGRESS: { label: 'Đang thực hành', tone: 'brand' },
  PRACTICED: { label: 'Đã thực hành', tone: 'ok' },
};

type Filter<T> = T | 'ALL';

/** SCR-04 Thư viện ca (FR-CASE-01, FR-CASE-02) */
export default function LibraryPage() {
  const cases = useCases();
  const [difficulty, setDifficulty] = useState<Filter<number>>('ALL');
  const [skill, setSkill] = useState<Filter<SkillCode>>('ALL');
  const [status, setStatus] = useState<Filter<PracticeStatus>>('ALL');

  const shown = (cases.data ?? []).filter(
    (c: CaseSummary) =>
      (difficulty === 'ALL' || c.difficulty === difficulty) &&
      (skill === 'ALL' || c.skills.includes(skill)) &&
      (status === 'ALL' || c.practiceStatus === status),
  );

  return (
    <>
      <PageHead title="Thư viện ca" sub="Chọn một ca để luyện tập. Bạn có thể thực hành bất cứ lúc nào." />
      <div className="stack" style={{ gap: 10 }}>
        <div className="chips" role="group" aria-label="Lọc theo độ khó">
          <button type="button" className="chip" aria-pressed={difficulty === 'ALL'} onClick={() => setDifficulty('ALL')}>
            Mọi độ khó
          </button>
          {[1, 2, 3].map((d) => (
            <button key={d} type="button" className="chip" aria-pressed={difficulty === d} onClick={() => setDifficulty(d)}>
              {DIFFICULTY_LABELS[d]}
            </button>
          ))}
        </div>
        <div className="row" style={{ gap: 10 }}>
          <label className="sr-only" htmlFor="filter-skill">
            Kỹ năng
          </label>
          <select
            id="filter-skill"
            className="select"
            style={{ width: 'auto' }}
            value={skill}
            onChange={(e) => setSkill(e.target.value as Filter<SkillCode>)}
          >
            <option value="ALL">Mọi kỹ năng</option>
            {SKILL_CODES.map((s) => (
              <option key={s} value={s}>
                {SKILL_LABELS[s]}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="filter-status">
            Trạng thái
          </label>
          <select
            id="filter-status"
            className="select"
            style={{ width: 'auto' }}
            value={status}
            onChange={(e) => setStatus(e.target.value as Filter<PracticeStatus>)}
          >
            <option value="ALL">Mọi trạng thái</option>
            {(Object.keys(STATUS) as PracticeStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS[s].label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {cases.isPending && <p className="muted">Đang tải danh sách ca...</p>}
      {cases.isError && <p role="alert">Không tải được thư viện ca. Hãy tải lại trang.</p>}
      {cases.data && !shown.length && (
        <section className="panel">
          <p className="muted">
            {cases.data.length ? 'Không có ca nào khớp bộ lọc. Hãy chọn điều kiện khác.' : 'Chưa có ca nào được xuất bản.'}
          </p>
        </section>
      )}
      {!!shown.length && (
        <div className="grid-3">
          {shown.map((c) => (
            <article className="case-card" key={c.id}>
              <div className="pic" role="img" aria-label={`Thân chủ ${c.clientName}`} style={{ backgroundImage: `url(${roomImage(c.avatarKey)})` }} />
              <div className="body">
                <h2>{c.title}</h2>
                <p className="small muted">{c.summary}</p>
                <div className="chips">
                  {c.skills.map((s) => (
                    <span key={s} className="tag">
                      {SKILL_LABELS[s]}
                    </span>
                  ))}
                </div>
                <div className="foot">
                  <span className="small muted">
                    {DIFFICULTY_LABELS[c.difficulty] ?? `Mức ${c.difficulty}`}, {c.maxDurationMin} phút
                  </span>
                  <span className={`badge ${STATUS[c.practiceStatus].tone}`}>{STATUS[c.practiceStatus].label}</span>
                </div>
                {!c.contentReviewed && <p className="small muted">Nội dung đang chờ đối chiếu giáo trình.</p>}
                <Link className="btn secondary" href={`/student/cases/${c.id}`}>
                  Xem ca
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
