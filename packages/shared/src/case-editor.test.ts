import { describe, expect, it } from 'vitest';
import { caseEditorSchema, missingForPublish } from './case-editor.js';

const full = caseEditorSchema.parse({
  title: 'Áp lực học tập',
  clientName: 'Hà Linh',
  summary: 'Sinh viên năm hai chịu áp lực',
  skills: ['EMPATHY'],
  openingText: 'Dạ, em chào anh chị.',
  background: 'Bối cảnh',
  mainIssue: 'Vấn đề',
  learningObjectives: ['Lắng nghe'],
  traits: ['dè dặt'],
  hiddenInformation: [{ content: 'Sợ mẹ thất vọng', unlockCondition: 'Khi tin cậy' }],
  emotionalArc: 'Từ lo lắng sang nhẹ nhõm',
  safetyBoundaries: ['Không chẩn đoán'],
  assessmentCriteria: [{ skill: 'EMPATHY', observableBehaviors: ['Ghi nhận cảm xúc'] }],
});

describe('missingForPublish', () => {
  it('ca đủ 8 thành phần thì xuất bản được', () => {
    expect(missingForPublish(full)).toEqual([]);
  });

  it('liệt kê đúng thành phần còn thiếu (FR-CASE-05)', () => {
    const draft = caseEditorSchema.parse({ title: 'Ca nháp' });
    const missing = missingForPublish(draft);
    expect(missing).toContain('Bối cảnh');
    expect(missing).toContain('Tiêu chí đánh giá');
    expect(missing).toContain('Kỹ năng trọng tâm');
    expect(missingForPublish({ ...full, hiddenInformation: [{ content: '', unlockCondition: '' }] })).toEqual(['Thông tin chưa chia sẻ']);
  });

  it('bản nháp chỉ bắt buộc có tên ca', () => {
    expect(caseEditorSchema.safeParse({ title: '' }).success).toBe(false);
    expect(caseEditorSchema.safeParse({ title: 'Ca mới', maxDurationMin: 200 }).success).toBe(false);
  });
});
