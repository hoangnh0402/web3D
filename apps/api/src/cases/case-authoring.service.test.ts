import { describe, expect, it } from 'vitest';
import { caseEditorSchema } from '@lab-fourt/shared';
import type { CaseVersion } from '../generated/prisma/client';
import { fromVersion, toProfile } from './case-authoring.service';

describe('chuyển đổi hồ sơ ca', () => {
  it('biểu mẫu thành hồ sơ rồi trở lại không mất dữ liệu', () => {
    const data = caseEditorSchema.parse({
      title: 'Ca thử',
      clientName: 'Mai Phương',
      clientAge: 19,
      summary: 'Tân sinh viên',
      avatarKey: 'c',
      difficulty: 2,
      maxDurationMin: 30,
      skills: ['AUTONOMY'],
      openingText: 'Em chào anh chị.',
      openingEmotion: 'ANXIOUS',
      background: 'Từ tỉnh lên Hà Nội',
      mainIssue: 'Lạc lõng',
      learningObjectives: ['Khám phá nguồn lực'],
      traits: ['nói nhiều khi căng thẳng'],
      speechStyle: 'Hay so sánh',
      hiddenInformation: [{ content: 'Có chị họ ở Hà Nội', unlockCondition: 'Khi hỏi về người hỗ trợ' }],
      emotionalArc: 'Lo lắng sang có hướng đi',
      safetyBoundaries: ['Không khuyên thay quyết định'],
      assessmentCriteria: [{ skill: 'AUTONOMY', observableBehaviors: ['Hỗ trợ quyền tự quyết'] }],
      contentReviewed: true,
    });
    const profile = toProfile(data) as Record<string, unknown>;
    expect(profile.hiddenInformation).toEqual([{ id: 'h1', content: 'Có chị họ ở Hà Nội', unlockCondition: 'Khi hỏi về người hỗ trợ' }]);
    expect(profile.opening).toEqual({ text: 'Em chào anh chị.', emotion: 'ANXIOUS' });

    const version = {
      profile,
      avatarKey: 'c',
      difficulty: 2,
      maxDurationMin: 30,
      skills: ['AUTONOMY'],
      contentReviewStatus: 'APPROVED',
    } as unknown as CaseVersion;
    expect(fromVersion('Ca thử', version)).toEqual(data);
  });

  it('hồ sơ cũ thiếu trường vẫn mở được để sửa', () => {
    const version = { profile: { clientName: 'Hà Linh' }, avatarKey: 'a', difficulty: 1, maxDurationMin: 25, skills: [], contentReviewStatus: 'PENDING' } as unknown as CaseVersion;
    const data = fromVersion('Ca cũ', version);
    expect(data).toMatchObject({ title: 'Ca cũ', clientName: 'Hà Linh', background: '', hiddenInformation: [] });
  });
});
