'use client';

import { useState } from 'react';
import { AlertTriangle, Download, Info, Table2, UserMinus } from 'lucide-react';
import { SKILL_LABELS, type ClassSkillStats } from '@lab-fourt/shared';
import { Modal } from '@/components/modal';
import { Field, Notice, PageHead } from '@/components/ui';
import { ApiRequestError } from '@/lib/api';
import { useClassMemberActions, useClassMembers, useClassStats, useLecturerClasses } from '@/lib/assignments';

/** Thứ tự hiển thị: mức 1 đến 4 rồi đến chưa đủ dữ liệu, cùng màu với prototype */
const ORDER = [1, 2, 3, 4, 0] as const;
const LEGEND: Record<number, string> = {
  1: '1. Chưa thể hiện',
  2: '2. Đang hình thành',
  3: '3. Đạt yêu cầu',
  4: '4. Thể hiện linh hoạt',
  0: 'Chưa đủ dữ liệu',
};
const FILL: Record<number, string> = { 1: 'var(--l1)', 2: 'var(--l2)', 3: 'var(--l3)', 4: 'var(--l4)', 0: 'var(--l0)' };

/** Chỉ gợi ý kỹ năng có từ 3 phiên được đánh giá, để không kết luận từ vài phiên lẻ */
const weakest = (stats: ClassSkillStats) => {
  const rated = stats.skills
    .map((s) => ({ ...s, rated: s.counts[1] + s.counts[2] + s.counts[3] + s.counts[4] }))
    .filter((s) => s.rated >= 3);
  return rated.sort((a, b) => (b.counts[1] + b.counts[2]) / b.rated - (a.counts[1] + a.counts[2]) / a.rated)[0];
};

const Stats = ({ classId }: { classId: string }) => {
  const stats = useClassStats(classId);
  const [table, setTable] = useState(false);
  if (!stats.data) return <p className="muted">{stats.isError ? 'Không tải được thống kê.' : 'Đang tải...'}</p>;
  const s = stats.data;
  const weak = weakest(s);
  return (
    <section className="panel stack lg">
      <div className="panel-head">
        <div className="stack" style={{ gap: 4 }}>
          <h2>Phân bố mức theo kỹ năng</h2>
          <p className="small muted">
            {s.sessionCount} phiên có báo cáo, tính cả phiên luyện tự do và phiên đã lưu trữ ở dạng tổng hợp. Số liệu theo đề xuất của AI,
            dùng để điều chỉnh định hướng giảng dạy, không phải điểm học phần.
          </p>
        </div>
        <div className="row">
          <button type="button" className="btn secondary sm" onClick={() => setTable((t) => !t)}>
            <Table2 size={15} aria-hidden />
            {table ? 'Xem biểu đồ' : 'Xem bảng số liệu'}
          </button>
          <a className="btn secondary sm" href={`/api/lecturer/classes/${classId}/export`} download>
            <Download size={15} aria-hidden />
            Xuất CSV
          </a>
        </div>
      </div>
      {weak && (
        <Notice icon={Info}>
          <b style={{ fontWeight: 500 }}>Nên chú ý: {SKILL_LABELS[weak.skill]}.</b> Trong các kỹ năng có từ 3 phiên được đánh giá trở lên, đây
          là kỹ năng có tỷ lệ phiên ở mức 1 và 2 cao nhất.
        </Notice>
      )}
      {!s.sessionCount ? (
        <p className="muted">Lớp chưa có phiên nào có báo cáo.</p>
      ) : table ? (
        <div className="table-wrap">
          <table className="t">
            <thead>
              <tr>
                <th scope="col">Kỹ năng</th>
                {ORDER.map((l) => (
                  <th scope="col" key={l}>
                    {LEGEND[l]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {s.skills.map((sk) => (
                <tr key={sk.skill}>
                  <td>{SKILL_LABELS[sk.skill]}</td>
                  {ORDER.map((l) => (
                    <td className="num" key={l}>
                      {sk.counts[l]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <div className="legend">
            {ORDER.map((l) => (
              <span key={l}>
                <i style={{ background: FILL[l] }} aria-hidden />
                {LEGEND[l]}
              </span>
            ))}
          </div>
          <div className="dist">
            {s.skills.flatMap((sk) => [
              <span key={sk.skill} className="small">
                {SKILL_LABELS[sk.skill]}
              </span>,
              <div
                key={`${sk.skill}-bar`}
                className="bar"
                role="img"
                aria-label={`${SKILL_LABELS[sk.skill]}: ${ORDER.map((l) => `${LEGEND[l]} ${sk.counts[l]}`).join(', ')}`}
              >
                {ORDER.map((l) =>
                  sk.counts[l] > 0 ? (
                    <i key={l} title={`${LEGEND[l]}: ${sk.counts[l]} phiên`} style={{ flexGrow: sk.counts[l], flexBasis: 0, background: FILL[l] }} />
                  ) : null,
                )}
              </div>,
            ])}
          </div>
        </>
      )}
    </section>
  );
};

const Members = ({ classId }: { classId: string }) => {
  const members = useClassMembers(classId);
  const { add, remove } = useClassMemberActions(classId);
  const [username, setUsername] = useState('');
  const [confirm, setConfirm] = useState<{ userId: string; fullName: string } | null>(null);
  const error = add.error ?? remove.error;
  return (
    <section className="panel stack">
      <h2>Sinh viên trong lớp</h2>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          if (username.trim()) add.mutate(username.trim(), { onSuccess: () => { setUsername(''); void members.refetch(); } });
        }}
      >
        <div className="grow">
          <Field id="add-student" label="Thêm sinh viên theo tên đăng nhập">
            <input id="add-student" className="input" value={username} onChange={(e) => setUsername(e.target.value)} />
          </Field>
        </div>
        <button type="submit" className="btn secondary" disabled={!username.trim() || add.isPending} style={{ alignSelf: 'flex-end' }}>
          Thêm
        </button>
      </form>
      {error && (
        <Notice tone="danger" icon={AlertTriangle}>
          {error instanceof ApiRequestError ? error.message : 'Thao tác chưa thành công, hãy thử lại.'}
        </Notice>
      )}
      <div>
        {members.data?.map((m) => (
          <div className="list-row" key={m.userId}>
            <div className="grow">
              <b>{m.fullName}</b>
              <div className="small muted">{m.username}</div>
            </div>
            <button type="button" className="btn ghost sm" onClick={() => setConfirm(m)}>
              <UserMinus size={15} aria-hidden />
              Bớt khỏi lớp
            </button>
          </div>
        ))}
        {members.data && !members.data.length && <p className="small muted">Lớp chưa có sinh viên.</p>}
      </div>
      {confirm && (
        <Modal
          title="Bớt sinh viên khỏi lớp?"
          onClose={() => setConfirm(null)}
          footer={
            <>
              <button type="button" className="btn secondary" onClick={() => setConfirm(null)}>
                Giữ lại
              </button>
              <button
                type="button"
                className="btn danger"
                onClick={() =>
                  remove.mutate(confirm.userId, {
                    onSettled: () => {
                      setConfirm(null);
                      void members.refetch();
                    },
                  })
                }
              >
                Bớt khỏi lớp
              </button>
            </>
          }
        >
          <p>
            {confirm.fullName} sẽ không còn thấy các bài giao cho lớp này. Phiên và bài đã nộp của sinh viên vẫn được giữ nguyên.
          </p>
        </Modal>
      )}
    </section>
  );
};

/** SCR-16 Thống kê kỹ năng và quản lý sinh viên trong lớp phụ trách (FR-LEC-05, FR-USR-04) */
export default function ClassesPage() {
  const classes = useLecturerClasses();
  const [picked, setPicked] = useState<string | null>(null);
  const classId = picked ?? classes.data?.[0]?.id ?? null;

  return (
    <>
      <PageHead title="Lớp và thống kê" sub="Sinh viên và phân bố kỹ năng của các lớp bạn phụ trách." />
      {classes.data && !classes.data.length && <p className="muted">Bạn chưa phụ trách lớp nào. Liên hệ quản trị viên để được gán lớp.</p>}
      {!!classes.data?.length && (
        <div className="chips" role="group" aria-label="Chọn lớp">
          {classes.data.map((c) => (
            <button key={c.id} type="button" className="chip" aria-pressed={classId === c.id} onClick={() => setPicked(c.id)}>
              {c.name} ({c.studentCount})
            </button>
          ))}
        </div>
      )}
      {classId && (
        <>
          <Stats key={`s-${classId}`} classId={classId} />
          <Members key={`m-${classId}`} classId={classId} />
        </>
      )}
    </>
  );
}
