'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueries } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import type { ClassMember } from '@lab-fourt/shared';
import { Field, Notice, PageHead } from '@/components/ui';
import { api, ApiRequestError } from '@/lib/api';
import { useCreateAssignment, useLecturerClasses } from '@/lib/assignments';
import { useCases } from '@/lib/sessions';

/** SCR-13 Giao bài cho lớp hoặc từng sinh viên, đặt hạn (FR-ASG-01) */
export default function AssignPage() {
  const router = useRouter();
  const cases = useCases();
  const classes = useLecturerClasses();
  const create = useCreateAssignment();
  const [caseId, setCaseId] = useState('');
  const [title, setTitle] = useState('');
  const [due, setDue] = useState('');
  const [classIds, setClassIds] = useState<string[]>([]);
  const [studentIds, setStudentIds] = useState<string[]>([]);

  // Sinh viên của mọi lớp phụ trách, để giao riêng cho từng người
  const members = useQueries({
    queries: (classes.data ?? []).map((c) => ({
      queryKey: ['lecturer', 'classes', c.id, 'students'],
      queryFn: () => api<ClassMember[]>(`/lecturer/classes/${c.id}/students`),
    })),
  });
  const students = [...new Map(members.flatMap((q) => q.data ?? []).map((m) => [m.userId, m])).values()].sort((a, b) =>
    a.fullName.localeCompare(b.fullName, 'vi'),
  );

  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  const fields = create.error instanceof ApiRequestError ? create.error.fields : undefined;

  const submit = () =>
    create.mutate(
      { caseId, title, dueAt: due ? new Date(due).toISOString() : null, classIds, studentIds },
      { onSuccess: ({ id }) => router.push(`/lecturer/assignments/${id}`) },
    );

  return (
    <>
      <PageHead title="Giao bài" sub="Chọn ca đã xuất bản, đối tượng và hạn hoàn thành. Sinh viên nộp sau hạn vẫn được, bài bị đánh dấu trễ." />
      <section className="panel stack lg" style={{ maxWidth: 760 }}>
        <Field id="asg-case" label="Ca mô phỏng" error={fields?.caseId}>
          <select
            id="asg-case"
            className="select"
            value={caseId}
            onChange={(e) => {
              setCaseId(e.target.value);
              const c = cases.data?.find((x) => x.id === e.target.value);
              if (c && !title) setTitle(c.title);
            }}
          >
            <option value="">Chọn ca</option>
            {cases.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} (thân chủ {c.clientName})
              </option>
            ))}
          </select>
        </Field>
        <Field id="asg-title" label="Tên bài" error={fields?.title}>
          <input id="asg-title" className="input" maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field id="asg-due" label="Hạn hoàn thành" hint="Bỏ trống nếu không đặt hạn." error={fields?.dueAt}>
          <input id="asg-due" className="input" type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} />
        </Field>
        <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="small" style={{ fontWeight: 600, color: 'var(--navy-900)', marginBottom: 6 }}>
            Giao cho lớp
          </legend>
          {!classes.data?.length && <p className="small muted">Bạn chưa phụ trách lớp nào. Liên hệ quản trị viên để được gán lớp.</p>}
          {classes.data?.map((c) => (
            <label className="check" key={c.id}>
              <input type="checkbox" checked={classIds.includes(c.id)} onChange={() => setClassIds((l) => toggle(l, c.id))} />
              <span>
                {c.name} ({c.studentCount} sinh viên)
              </span>
            </label>
          ))}
        </fieldset>
        {!!students.length && (
          <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="small" style={{ fontWeight: 600, color: 'var(--navy-900)', marginBottom: 6 }}>
              Hoặc giao riêng cho sinh viên
            </legend>
            <div className="chips">
              {students.map((s) => (
                <button
                  key={s.userId}
                  type="button"
                  className="chip"
                  aria-pressed={studentIds.includes(s.userId)}
                  onClick={() => setStudentIds((l) => toggle(l, s.userId))}
                >
                  {s.fullName}
                </button>
              ))}
            </div>
          </fieldset>
        )}
        {fields?.classIds && (
          <Notice tone="danger" icon={AlertTriangle}>
            {fields.classIds}
          </Notice>
        )}
        {create.error && !fields && (
          <Notice tone="danger" icon={AlertTriangle}>
            {create.error instanceof ApiRequestError ? create.error.message : 'Chưa giao được bài, hãy thử lại.'}
          </Notice>
        )}
        <div>
          <button
            type="button"
            className="btn primary"
            disabled={!caseId || !title.trim() || classIds.length + studentIds.length === 0 || create.isPending}
            onClick={submit}
          >
            {create.isPending ? 'Đang giao...' : 'Giao bài'}
          </button>
        </div>
      </section>
    </>
  );
}
