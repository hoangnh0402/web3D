/**
 * Dữ liệu ban đầu theo docs/srs/04 mục 6:
 * - Một quản trị viên đầu tiên, lấy từ SEED_ADMIN_USERNAME và SEED_ADMIN_PASSWORD.
 * - 3 ca mẫu ở trạng thái Nháp, rubric mặc định 6 kỹ năng, tham số hệ thống mặc định.
 * - Ngoài production: thêm tài khoản thử và một lớp mẫu để phát triển.
 * Chạy lại nhiều lần vẫn an toàn: bản ghi đã có thì giữ nguyên.
 */
import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';
import { SKILL_CODES } from '@lab-fourt/shared';
import { PrismaClient, type Prisma, type Role } from '../src/generated/prisma/client';
import { DEFAULT_SETTINGS } from '../src/settings/settings.service';

try {
  process.loadEnvFile();
} catch {
  // Không có .env: dùng biến môi trường của hệ thống
}

const url = process.env.DATABASE_URL;
if (!url) throw new Error('Thiếu DATABASE_URL');
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
const production = process.env.NODE_ENV === 'production';
const hash = (p: string) => argon2.hash(p, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });

/** Tài khoản thử, chỉ tạo ngoài production. Mật khẩu chung để dễ thử, buộc đổi ở lần đăng nhập đầu. */
export const DEV_PASSWORD = 'LabFourT2026';
const DEV_USERS: { username: string; fullName: string; role: Role }[] = [
  { username: 'giangvien', fullName: 'Nguyễn Thu Trang', role: 'LECTURER' },
  { username: 'sinhvien1', fullName: 'Trần Minh Anh', role: 'STUDENT' },
  { username: 'sinhvien2', fullName: 'Lê Hoàng Nam', role: 'STUDENT' },
];

const RUBRIC = { skills: SKILL_CODES, levels: [1, 2, 3, 4] };

/** Nội dung lấy từ prototype đã duyệt. Đang chờ đối chiếu giáo trình (OI-02) nên để Nháp. */
const CASES: {
  title: string;
  avatarKey: 'a' | 'b' | 'c';
  difficulty: number;
  minutes: number;
  skills: (typeof SKILL_CODES)[number][];
  profile: Prisma.InputJsonValue;
}[] = [
  {
    title: 'Áp lực học tập',
    avatarKey: 'a',
    difficulty: 1,
    minutes: 25,
    skills: ['ACTIVE_LISTENING', 'OPEN_QUESTIONS', 'EMPATHY'],
    profile: {
      clientName: 'Hà Linh',
      clientAge: 20,
      summary: 'Sinh viên năm hai chịu áp lực từ kết quả học tập và kỳ vọng của gia đình.',
      background:
        'Hà Linh là sinh viên năm hai, gia đình ở quê làm nông, là người đầu tiên trong nhà học đại học. Kỳ vừa rồi Linh trượt hai môn và chưa nói với ai.',
      mainIssue: 'Linh mất ngủ, học không vào và sợ gia đình thất vọng.',
      learningObjectives: ['Lắng nghe', 'Làm rõ vấn đề', 'Phản hồi cảm xúc'],
      persona: { traits: ['dè dặt', 'lo lắng'], speechStyle: 'Nói ngắn, hay ngập ngừng ở đầu phiên' },
      hiddenInformation: [
        { id: 'h1', content: 'Linh sợ nhất là làm mẹ thất vọng.', unlockCondition: 'Khi người tham vấn đã tạo được sự tin cậy' },
      ],
      emotionalArc: 'Từ dè dặt sang lo lắng, buồn, rồi nhẹ nhõm hơn khi được lắng nghe.',
      safetyBoundaries: [
        'Không tự suy diễn chẩn đoán',
        'Nếu xuất hiện ý nghĩ biến mất hoặc tự hại, hiển thị hướng dẫn an toàn',
      ],
      assessmentCriteria: [
        { skill: 'ACTIVE_LISTENING', observableBehaviors: ['Phản hồi đúng điều thân chủ nói'] },
        { skill: 'OPEN_QUESTIONS', observableBehaviors: ['Dùng câu hỏi mở'] },
        { skill: 'EMPATHY', observableBehaviors: ['Ghi nhận cảm xúc có căn cứ'] },
        { skill: 'SUMMARIZING', observableBehaviors: ['Tóm tắt và kiểm tra lại'] },
      ],
    },
  },
  {
    title: 'Khó khăn trong mối quan hệ',
    avatarKey: 'b',
    difficulty: 2,
    minutes: 30,
    skills: ['EMPATHY', 'OPEN_QUESTIONS', 'AUTONOMY'],
    profile: {
      clientName: 'Tuấn Kiệt',
      clientAge: 22,
      summary: 'Thân chủ gặp mâu thuẫn và tổn thương trong một mối quan hệ thân thiết.',
      background: 'Tuấn Kiệt vừa chia tay sau ba năm và thường xuyên cãi nhau với bạn cùng phòng.',
      mainIssue: 'Kiệt thấy bị bỏ rơi và ngày càng thu mình.',
      learningObjectives: ['Thấu cảm', 'Câu hỏi mở', 'Không phán xét', 'Tôn trọng lựa chọn'],
      persona: { traits: ['dễ phòng thủ'], speechStyle: 'Hay nói đùa để né tránh' },
      hiddenInformation: [
        { id: 'h1', content: 'Kiệt tự trách vì đã im lặng quá lâu trong mối quan hệ.', unlockCondition: 'Khi được hỏi mở về cảm xúc của mình' },
      ],
      emotionalArc: 'Từ phòng thủ sang tổn thương, rồi cởi mở hơn.',
      safetyBoundaries: ['Không đánh giá đúng sai trong mối quan hệ'],
      assessmentCriteria: [
        { skill: 'EMPATHY', observableBehaviors: ['Ghi nhận cảm xúc', 'Không phán xét'] },
        { skill: 'AUTONOMY', observableBehaviors: ['Tôn trọng lựa chọn của thân chủ'] },
      ],
    },
  },
  {
    title: 'Thích nghi với thay đổi',
    avatarKey: 'c',
    difficulty: 2,
    minutes: 30,
    skills: ['SUMMARIZING', 'AUTONOMY', 'OPEN_QUESTIONS'],
    profile: {
      clientName: 'Mai Phương',
      clientAge: 19,
      summary: 'Tân sinh viên khó thích nghi với môi trường sống và học tập mới.',
      background: 'Mai Phương từ tỉnh lên Hà Nội học đại học, lần đầu xa nhà, chưa có bạn thân.',
      mainIssue: 'Phương thấy lạc lõng và nghĩ đến việc bỏ học.',
      learningObjectives: ['Khám phá nguồn lực', 'Xác định mục tiêu', 'Hỗ trợ quyền tự quyết'],
      persona: { traits: ['lo lắng', 'hay so sánh với bạn bè'], speechStyle: 'Nói nhiều khi căng thẳng' },
      hiddenInformation: [
        { id: 'h1', content: 'Phương có một người chị họ ở Hà Nội nhưng ngại nhờ vả.', unlockCondition: 'Khi được hỏi về những người có thể hỗ trợ' },
      ],
      emotionalArc: 'Từ lo lắng sang có thêm hướng đi cụ thể.',
      safetyBoundaries: ['Không đưa lời khuyên thay cho quyết định của thân chủ'],
      assessmentCriteria: [
        { skill: 'AUTONOMY', observableBehaviors: ['Hỗ trợ quyền tự quyết'] },
        { skill: 'SUMMARIZING', observableBehaviors: ['Cùng xác định mục tiêu'] },
      ],
    },
  },
];

async function upsertUser(username: string, fullName: string, role: Role, password: string) {
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) return existing;
  return prisma.user.create({
    data: { username, fullName, role, passwordHash: await hash(password), mustChangePassword: true },
  });
}

async function main() {
  const adminUser = process.env.SEED_ADMIN_USERNAME;
  const adminPass = process.env.SEED_ADMIN_PASSWORD;
  if (!adminUser || !adminPass) throw new Error('Thiếu SEED_ADMIN_USERNAME hoặc SEED_ADMIN_PASSWORD');
  if (production && adminPass.length < 12) throw new Error('Mật khẩu quản trị viên đầu tiên cần ít nhất 12 ký tự');
  const admin = await upsertUser(adminUser, 'Quản trị viên', 'ADMIN', adminPass);

  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await prisma.systemSetting.upsert({ where: { key }, update: {}, create: { key, value } });
  }

  let owner = admin;
  if (!production) {
    const users = [];
    for (const u of DEV_USERS) users.push(await upsertUser(u.username, u.fullName, u.role, DEV_PASSWORD));
    owner = users[0]!;
    const cls =
      (await prisma.class.findFirst({ where: { name: 'Tham vấn K68' } })) ??
      (await prisma.class.create({ data: { name: 'Tham vấn K68', term: 'Học kỳ 1, 2026-2027' } }));
    for (const u of users) {
      await prisma.classMember.upsert({
        where: { classId_userId: { classId: cls.id, userId: u.id } },
        update: {},
        create: { classId: cls.id, userId: u.id, memberRole: u.role === 'LECTURER' ? 'LECTURER' : 'STUDENT' },
      });
    }
  }

  for (const c of CASES) {
    if (await prisma.case.findFirst({ where: { title: c.title } })) continue;
    const created = await prisma.case.create({ data: { title: c.title, ownerId: owner.id, status: 'DRAFT' } });
    const version = await prisma.caseVersion.create({
      data: {
        caseId: created.id,
        versionNo: 1,
        profile: c.profile,
        rubric: RUBRIC,
        difficulty: c.difficulty,
        skills: c.skills,
        maxDurationMin: c.minutes,
        avatarKey: c.avatarKey,
      },
    });
    await prisma.case.update({ where: { id: created.id }, data: { currentVersionId: version.id } });
  }

  console.log(`Seed xong: quản trị viên "${adminUser}"${production ? '' : `, tài khoản thử dùng mật khẩu ${DEV_PASSWORD}`}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
