import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Phạm vi của giảng viên (docs/srs/02 mục 14, "Trong phạm vi"): chỉ các lớp mình phụ trách
 * và sinh viên thuộc các lớp đó.
 */
@Injectable()
export class LecturerScopeService {
  constructor(private readonly prisma: PrismaService) {}

  async classIds(lecturerId: string) {
    const rows = await this.prisma.classMember.findMany({
      where: { userId: lecturerId, memberRole: 'LECTURER', class: { status: 'ACTIVE' } },
      select: { classId: true },
    });
    return rows.map((r) => r.classId);
  }

  async assertClass(lecturerId: string, classId: string) {
    if (!(await this.classIds(lecturerId)).includes(classId)) {
      throw new ForbiddenException('Bạn không phụ trách lớp này');
    }
  }

  /** Sinh viên thuộc các lớp giảng viên phụ trách */
  async studentIds(lecturerId: string) {
    const rows = await this.prisma.classMember.findMany({
      where: { memberRole: 'STUDENT', classId: { in: await this.classIds(lecturerId) } },
      select: { userId: true },
    });
    return [...new Set(rows.map((r) => r.userId))];
  }
}
