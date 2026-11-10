'use client';

import { useState } from 'react';
import { AlertTriangle, Plus, UserMinus } from 'lucide-react';
import type { AdminClass } from '@lab-fourt/shared';
import { Field, Notice, PageHead } from '@/components/ui';
import { ApiRequestError } from '@/lib/api';
import { useAdminClasses, useAdminUsers, useClassStatus, useRemoveClassMember, useSaveClass, useSetClassMembers } from '@/lib/admin';

const errorText = (e: unknown) => (e instanceof ApiRequestError ? e.message : e ? 'Thao tác chưa thành công, hãy thử lại.' : '');

const ClassCard = ({ c }: { c: AdminClass }) => {
  const lecturers = useAdminUsers('').data?.filter((u) => u.role === 'LECTURER' && u.status === 'ACTIVE') ?? [];
  const members = useSetClassMembers();
  const remove = useRemoveClassMember();
  const status = useClassStatus();
  const [usernames, setUsernames] = useState('');
  const chosen = c.lecturers.map((l) => l.userId);
  const error = members.error ?? remove.error ?? status.error;

  return (
    <section className="panel stack">
      <div className="panel-head">
        <div>
          <h2>{c.name}</h2>
          <span className="small muted">
            {c.term || 'Chưa ghi học kỳ'}, {c.students.length} sinh viên
          </span>
        </div>
        <button type="button" className="btn ghost sm" onClick={() => status.mutate({ id: c.id, status: c.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE' })}>
          {c.status === 'ACTIVE' ? 'Lưu trữ lớp' : 'Mở lại lớp'}
        </button>
      </div>
      {c.status === 'ARCHIVED' && <span className="badge">Đã lưu trữ</span>}
      <div className="field">
        <span className="lbl">Giảng viên phụ trách</span>
        <div className="chips" role="group" aria-label={`Giảng viên phụ trách ${c.name}`}>
          {lecturers.map((l) => (
            <button
              key={l.id}
              type="button"
              className="chip"
              aria-pressed={chosen.includes(l.id)}
              onClick={() =>
                members.mutate({ id: c.id, lecturerIds: chosen.includes(l.id) ? chosen.filter((x) => x !== l.id) : [...chosen, l.id] })
              }
            >
              {l.fullName}
            </button>
          ))}
          {!lecturers.length && <span className="small muted">Chưa có tài khoản giảng viên.</span>}
        </div>
      </div>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          const list = usernames
            .split(/[\s,;]+/)
            .map((x) => x.trim().toLowerCase())
            .filter(Boolean);
          if (list.length) members.mutate({ id: c.id, studentUsernames: list }, { onSuccess: (r) => !r.missing.length && setUsernames('') });
        }}
      >
        <div className="grow">
          <Field id={`add-${c.id}`} label="Thêm sinh viên" hint="Nhập tên đăng nhập, cách nhau bằng dấu phẩy hoặc xuống dòng.">
            <input id={`add-${c.id}`} className="input" value={usernames} onChange={(e) => setUsernames(e.target.value)} />
          </Field>
        </div>
        <button type="submit" className="btn secondary" disabled={!usernames.trim() || members.isPending}>
          Thêm
        </button>
      </form>
      {!!members.data?.missing.length && (
        <Notice tone="warn" icon={AlertTriangle}>
          Không tìm thấy sinh viên: {members.data.missing.join(', ')}
        </Notice>
      )}
      {error && (
        <Notice tone="danger" icon={AlertTriangle}>
          {errorText(error)}
        </Notice>
      )}
      <div>
        {c.students.map((s) => (
          <div className="list-row" key={s.userId}>
            <div className="grow">
              <b>{s.fullName}</b>
              <div className="small muted">{s.username}</div>
            </div>
            <button type="button" className="btn ghost sm" onClick={() => remove.mutate({ id: c.id, userId: s.userId })}>
              <UserMinus size={15} aria-hidden />
              Bớt khỏi lớp
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};

/** SCR-18 Quản lý lớp: tạo lớp, gán giảng viên, thêm bớt sinh viên (FR-USR-03, FR-USR-04) */
export default function AdminClassesPage() {
  const classes = useAdminClasses();
  const save = useSaveClass();
  const [name, setName] = useState('');
  const [term, setTerm] = useState('');
  return (
    <>
      <PageHead title="Lớp" sub="Tạo lớp hoặc nhóm, gán giảng viên phụ trách và sinh viên." />
      <section className="panel">
        <form
          className="row"
          style={{ alignItems: 'flex-end' }}
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate({ name, term }, { onSuccess: () => (setName(''), setTerm('')) });
          }}
        >
          <div className="grow">
            <Field id="cls-name" label="Tên lớp">
              <input id="cls-name" className="input" maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
          </div>
          <div className="grow">
            <Field id="cls-term" label="Học kỳ">
              <input id="cls-term" className="input" maxLength={120} value={term} onChange={(e) => setTerm(e.target.value)} />
            </Field>
          </div>
          <button type="submit" className="btn primary" disabled={!name.trim() || save.isPending}>
            <Plus size={17} aria-hidden />
            Tạo lớp
          </button>
        </form>
        {save.error && (
          <Notice tone="danger" icon={AlertTriangle}>
            {errorText(save.error)}
          </Notice>
        )}
      </section>
      {classes.isPending && <p className="muted">Đang tải...</p>}
      <div className="grid-2-eq">
        {classes.data?.map((c) => (
          <ClassCard key={c.id} c={c} />
        ))}
      </div>
    </>
  );
}
