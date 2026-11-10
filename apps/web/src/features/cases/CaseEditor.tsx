'use client';

import { useState } from 'react';
import { AlertTriangle, BookCheck, Check, Info, Plus, Trash2 } from 'lucide-react';
import {
  AVATAR_KEYS,
  CASE_COMPONENTS,
  caseEditorSchema,
  EMOTIONS,
  EMOTION_LABELS,
  missingForPublish,
  SKILL_CODES,
  SKILL_LABELS,
  type CaseEditorData,
  type SkillCode,
} from '@lab-fourt/shared';
import { Field, Notice } from '@/components/ui';
import { DIFFICULTY_LABELS } from '@/lib/sessions';
import { roomImage } from '@/features/room/RoomView';

const CLIENTS: Record<string, string> = { a: 'Nhân vật nữ, tóc ngang vai', b: 'Nhân vật nam', c: 'Nhân vật nữ, tóc dài' };
type ComponentKey = (typeof CASE_COMPONENTS)[number]['key'];

/** Ô nhập nhiều dòng, mỗi dòng một mục */
const Lines = ({ id, label, hint, value, onChange }: { id: string; label: string; hint?: string; value: string[]; onChange: (v: string[]) => void }) => (
  <Field id={id} label={label} hint={hint ?? 'Mỗi dòng một mục.'}>
    <textarea id={id} className="textarea" rows={6} value={value.join('\n')} onChange={(e) => onChange(e.target.value.split('\n'))} />
  </Field>
);

/**
 * Trình soạn ca 8 bước (SCR-12), cùng bố cục với prototype.
 * Dữ liệu chỉ lưu khi bấm Lưu nháp; xuất bản cần đủ 8 thành phần (FR-CASE-05).
 */
export const CaseEditor = ({
  initial,
  status,
  saving,
  publishing,
  error,
  onSave,
  onPublish,
  hasDraft = true,
}: {
  initial: CaseEditorData;
  status?: string;
  saving: boolean;
  publishing?: boolean;
  error?: string | null;
  onSave: (d: CaseEditorData) => void;
  onPublish?: (d: CaseEditorData, dirty: boolean) => void;
  /** Có bản nháp chưa xuất bản. Không có nháp và không sửa gì thì không có gì để xuất bản. */
  hasDraft?: boolean;
}) => {
  const [d, setD] = useState<CaseEditorData>(initial);
  const [step, setStep] = useState(0);
  const set = <K extends keyof CaseEditorData>(key: K, value: CaseEditorData[K]) => setD((x) => ({ ...x, [key]: value }));
  const missing = missingForPublish(caseEditorSchema.parse(d));
  const dirty = JSON.stringify(d) !== JSON.stringify(initial);
  const cur = CASE_COMPONENTS[step]!;
  const filled = (key: ComponentKey) => !missing.includes(CASE_COMPONENTS.find((c) => c.key === key)!.label);

  const body: Record<ComponentKey, React.ReactNode> = {
    background: (
      <Field id="c-background" label={cur.label} hint={cur.help}>
        <textarea id="c-background" className="textarea" rows={6} value={d.background} onChange={(e) => set('background', e.target.value)} />
      </Field>
    ),
    mainIssue: (
      <Field id="c-issue" label={cur.label} hint={cur.help}>
        <textarea id="c-issue" className="textarea" rows={6} value={d.mainIssue} onChange={(e) => set('mainIssue', e.target.value)} />
      </Field>
    ),
    learningObjectives: <Lines id="c-goals" label={cur.label} hint={cur.help} value={d.learningObjectives} onChange={(v) => set('learningObjectives', v)} />,
    traits: (
      <>
        <Lines id="c-traits" label="Nét tính cách" hint="Mỗi dòng một nét, ví dụ: dè dặt, lo lắng." value={d.traits} onChange={(v) => set('traits', v)} />
        <Field id="c-speech" label="Cách giao tiếp" hint="Ví dụ: nói ngắn, hay ngập ngừng ở đầu phiên.">
          <input id="c-speech" className="input" value={d.speechStyle} onChange={(e) => set('speechStyle', e.target.value)} />
        </Field>
      </>
    ),
    hiddenInformation: (
      <div className="stack">
        <p className="small muted">{cur.help}</p>
        {d.hiddenInformation.map((h, i) => (
          <div key={i} className="grid-2-eq" style={{ alignItems: 'end' }}>
            <Field id={`c-hidden-${i}`} label={`Chi tiết ${i + 1}`}>
              <input
                id={`c-hidden-${i}`}
                className="input"
                value={h.content}
                onChange={(e) => set('hiddenInformation', d.hiddenInformation.map((x, k) => (k === i ? { ...x, content: e.target.value } : x)))}
              />
            </Field>
            <div className="row" style={{ alignItems: 'end' }}>
              <div className="grow">
                <Field id={`c-unlock-${i}`} label="Xuất hiện khi">
                  <input
                    id={`c-unlock-${i}`}
                    className="input"
                    value={h.unlockCondition}
                    onChange={(e) =>
                      set('hiddenInformation', d.hiddenInformation.map((x, k) => (k === i ? { ...x, unlockCondition: e.target.value } : x)))
                    }
                  />
                </Field>
              </div>
              <button
                type="button"
                className="icon-btn"
                aria-label={`Xóa chi tiết ${i + 1}`}
                onClick={() => set('hiddenInformation', d.hiddenInformation.filter((_, k) => k !== i))}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        <div>
          <button
            type="button"
            className="btn secondary sm"
            onClick={() => set('hiddenInformation', [...d.hiddenInformation, { content: '', unlockCondition: '' }])}
          >
            <Plus size={15} aria-hidden />
            Thêm chi tiết
          </button>
        </div>
      </div>
    ),
    emotionalArc: (
      <Field id="c-arc" label={cur.label} hint={cur.help}>
        <textarea id="c-arc" className="textarea" rows={6} value={d.emotionalArc} onChange={(e) => set('emotionalArc', e.target.value)} />
      </Field>
    ),
    safetyBoundaries: <Lines id="c-safety" label={cur.label} hint={cur.help} value={d.safetyBoundaries} onChange={(v) => set('safetyBoundaries', v)} />,
    assessmentCriteria: (
      <div className="stack">
        <p className="small muted">{cur.help} Kỹ năng lấy theo danh sách kỹ năng trọng tâm ở trên.</p>
        {!d.skills.length && <p className="small">Hãy chọn kỹ năng trọng tâm trước.</p>}
        {d.skills.map((skill) => {
          const row = d.assessmentCriteria.find((c) => c.skill === skill);
          return (
            <Lines
              key={skill}
              id={`c-crit-${skill}`}
              label={SKILL_LABELS[skill]}
              hint="Mỗi dòng một hành vi quan sát được."
              value={row?.observableBehaviors ?? []}
              onChange={(v) =>
                set('assessmentCriteria', [
                  ...d.assessmentCriteria.filter((c) => c.skill !== skill),
                  { skill, observableBehaviors: v },
                ])
              }
            />
          );
        })}
      </div>
    ),
  };

  const toggleSkill = (s: SkillCode) => set('skills', d.skills.includes(s) ? d.skills.filter((x) => x !== s) : [...d.skills, s]);

  return (
    <div className="stack lg">
      <div className="row">
        <button type="button" className="btn secondary" disabled={saving || !d.title.trim()} onClick={() => onSave(d)}>
          {saving ? 'Đang lưu...' : 'Lưu nháp'}
        </button>
        {onPublish && (
          <button
            type="button"
            className="btn primary"
            disabled={!!missing.length || publishing || saving || (!dirty && !hasDraft)}
            onClick={() => onPublish(d, dirty)}
            title={missing.length ? `Còn thiếu: ${missing.join(', ')}` : undefined}
          >
            <BookCheck size={17} aria-hidden />
            {publishing ? 'Đang xuất bản...' : dirty ? 'Lưu và xuất bản' : 'Xuất bản'}
          </button>
        )}
        {status && <span className="small muted">{status}</span>}
        {dirty && <span className="small muted">Có thay đổi chưa lưu</span>}
      </div>
      {error && (
        <Notice tone="danger" icon={AlertTriangle}>
          {error}
        </Notice>
      )}
      <section className="panel stack">
        <div className="grid-2-eq">
          <Field id="c-title" label="Tên ca">
            <input id="c-title" className="input" maxLength={200} value={d.title} onChange={(e) => set('title', e.target.value)} />
          </Field>
          <Field id="c-client" label="Tên thân chủ">
            <input id="c-client" className="input" maxLength={100} value={d.clientName} onChange={(e) => set('clientName', e.target.value)} />
          </Field>
          <Field id="c-age" label="Tuổi thân chủ">
            <input
              id="c-age"
              className="input num"
              type="number"
              min={10}
              max={100}
              value={d.clientAge ?? ''}
              onChange={(e) => set('clientAge', e.target.value ? Number(e.target.value) : null)}
            />
          </Field>
          <Field id="c-diff" label="Độ khó">
            <select id="c-diff" className="select" value={d.difficulty} onChange={(e) => set('difficulty', Number(e.target.value))}>
              {[1, 2, 3].map((n) => (
                <option key={n} value={n}>
                  {DIFFICULTY_LABELS[n]}
                </option>
              ))}
            </select>
          </Field>
          <Field id="c-mins" label="Thời lượng tối đa (phút)">
            <input
              id="c-mins"
              className="input num"
              type="number"
              min={5}
              max={90}
              value={d.maxDurationMin}
              onChange={(e) => set('maxDurationMin', Number(e.target.value))}
            />
          </Field>
          <Field id="c-avatar" label="Nhân vật 3D">
            <select id="c-avatar" className="select" value={d.avatarKey} onChange={(e) => set('avatarKey', e.target.value as CaseEditorData['avatarKey'])}>
              {AVATAR_KEYS.map((k) => (
                <option key={k} value={k}>
                  {CLIENTS[k]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field id="c-summary" label="Mô tả ngắn" hint="Hiện trên thẻ ca trong thư viện.">
          <input id="c-summary" className="input" maxLength={500} value={d.summary} onChange={(e) => set('summary', e.target.value)} />
        </Field>
        <div className="field">
          <span className="lbl">Kỹ năng trọng tâm</span>
          <div className="chips" role="group" aria-label="Kỹ năng trọng tâm">
            {SKILL_CODES.map((s) => (
              <button key={s} type="button" className="chip" aria-pressed={d.skills.includes(s)} onClick={() => toggleSkill(s)}>
                {SKILL_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
        <div className="grid-2-eq">
          <Field id="c-opening" label="Câu mở đầu của thân chủ" hint="Thân chủ nói câu này khi sinh viên vào phòng.">
            <input id="c-opening" className="input" maxLength={500} value={d.openingText} onChange={(e) => set('openingText', e.target.value)} />
          </Field>
          <Field id="c-opening-emotion" label="Cảm xúc khi mở đầu">
            <select
              id="c-opening-emotion"
              className="select"
              value={d.openingEmotion}
              onChange={(e) => set('openingEmotion', e.target.value as CaseEditorData['openingEmotion'])}
            >
              {EMOTIONS.map((e) => (
                <option key={e} value={e}>
                  {EMOTION_LABELS[e]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <label className="check">
          <input type="checkbox" checked={d.contentReviewed} onChange={(e) => set('contentReviewed', e.target.checked)} />
          <span>Nội dung ca đã được đối chiếu với giáo trình</span>
        </label>
      </section>

      <div className="editor">
        <nav className="panel steps" aria-label="Thành phần của ca" style={{ padding: 8 }}>
          {CASE_COMPONENTS.map((c, i) => (
            <button key={c.key} type="button" aria-current={i === step} onClick={() => setStep(i)}>
              {c.label}
              {filled(c.key) && <Check size={15} aria-label="Đã điền" color="var(--ok)" />}
            </button>
          ))}
        </nav>
        <div className="stack lg">
          <section className="panel stack">
            <h2>{cur.label}</h2>
            {body[cur.key]}
            <div className="row between">
              <button type="button" className="btn secondary" disabled={step === 0} onClick={() => setStep(step - 1)}>
                Trước
              </button>
              <span className="small muted num">
                {step + 1}/{CASE_COMPONENTS.length}
              </span>
              <button type="button" className="btn secondary" disabled={step === CASE_COMPONENTS.length - 1} onClick={() => setStep(step + 1)}>
                Tiếp theo
              </button>
            </div>
          </section>
          {missing.length > 0 && (
            <Notice tone="warn" icon={Info}>
              Để xuất bản, còn thiếu: {missing.join(', ')}.
            </Notice>
          )}
          <section className="panel stack">
            <h2>Xem trước thẻ ca</h2>
            <article className="case-card" style={{ maxWidth: 360 }}>
              <div className="pic" role="img" aria-label={`Thân chủ ${d.clientName}`} style={{ backgroundImage: `url(${roomImage(d.avatarKey)})` }} />
              <div className="body">
                <h2>{d.title || 'Ca mới'}</h2>
                <p className="small muted">{d.summary || 'Chưa có mô tả.'}</p>
                <div className="chips">
                  {d.skills.map((s) => (
                    <span key={s} className="tag">
                      {SKILL_LABELS[s]}
                    </span>
                  ))}
                </div>
                <span className="small muted">
                  {DIFFICULTY_LABELS[d.difficulty]}, {d.maxDurationMin} phút
                </span>
              </div>
            </article>
          </section>
        </div>
      </div>
    </div>
  );
};
