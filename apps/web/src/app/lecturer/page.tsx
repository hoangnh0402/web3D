'use client';

import Link from 'next/link';
import { CalendarPlus } from 'lucide-react';
import { PageHead } from '@/components/ui';
import { fmtDue, useLecturerAssignments, useLecturerClasses } from '@/lib/assignments';

/** SCR-11 Tổng quan giảng viên (FR-LEC-01) */
export default function LecturerHome() {
  const classes = useLecturerClasses();
  const assignments = useLecturerAssignments();
  const list = assignments.data ?? [];
  const students = (classes.data ?? []).reduce((n, c) => n + c.studentCount, 0);
  const open = list.filter((a) => a.status === 'OPEN');
  const waiting = list.reduce((n, a) => n + a.awaitingReview, 0);

  return (
    <>
      <PageHead
        title="Tổng quan"
        sub={classes.data?.length ? classes.data.map((c) => c.name).join(', ') : 'Bạn chưa phụ trách lớp nào'}
        actions={
          <Link className="btn primary" href="/lecturer/assign">
            <CalendarPlus size={17} aria-hidden />
            Giao bài mới
          </Link>
        }
      />
      <div className="grid-4">
        <div className="stat">
          <span className="big">{students}</span>
          <span>Sinh viên phụ trách</span>
        </div>
        <div className="stat">
          <span className="big">{open.length}</span>
          <span>Bài đang mở</span>
        </div>
        <div className="stat">
          <span className="big">{waiting}</span>
          <span>Bài chờ xem xét</span>
        </div>
        <div className="stat">
          <span className="big">{classes.data?.length ?? 0}</span>
          <span>Lớp phụ trách</span>
        </div>
      </div>
      <section className="panel flush">
        <div className="panel-head">
          <h2>Bài đã giao</h2>
        </div>
        {assignments.isPending && (
          <p className="muted" style={{ padding: 22 }}>
            Đang tải...
          </p>
        )}
        {assignments.data && !list.length && (
          <p className="muted" style={{ padding: 22 }}>
            Bạn chưa giao bài nào. <Link href="/lecturer/assign">Giao bài đầu tiên</Link>.
          </p>
        )}
        {!!list.length && (
          <div className="table-wrap">
            <table className="t">
              <thead>
                <tr>
                  <th scope="col">Bài</th>
                  <th scope="col">Ca</th>
                  <th scope="col">Hạn</th>
                  <th scope="col">Đã nộp</th>
                  <th scope="col">Chờ xem xét</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col" className="act">
                    <span className="sr-only">Thao tác</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.map((a) => (
                  <tr key={a.id}>
                    <td>{a.title}</td>
                    <td>{a.caseTitle}</td>
                    <td className="num">{fmtDue(a.dueAt)}</td>
                    <td className="num">
                      {a.submittedCount}/{a.targetCount}
                      {a.lateCount > 0 && <span className="small muted"> ({a.lateCount} trễ)</span>}
                    </td>
                    <td className="num">{a.awaitingReview}</td>
                    <td>
                      <span className={`badge ${a.status === 'OPEN' ? 'brand' : ''}`}>{a.status === 'OPEN' ? 'Đang mở' : 'Đã đóng'}</span>
                    </td>
                    <td className="act">
                      <Link className="btn ghost sm" href={`/lecturer/assignments/${a.id}`}>
                        Xem tiến độ
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
