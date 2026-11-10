import { Injectable, NotFoundException } from '@nestjs/common';
import { AUDIT, AuditService } from '../audit/audit.service';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { SessionUser } from '../common/request';

export const sessionInclude = {
  caseVersion: { include: { case: true } },
  messages: { orderBy: { seq: 'asc' } },
  assignment: true,
  submission: true,
} satisfies Prisma.PracticeSessionInclude;

export type LoadedSession = Prisma.PracticeSessionGetPayload<{ include: typeof sessionInclude }>;

/**
 * Kiểm tra quyền theo từng bản ghi (NFR-SEC-08): chỉ chủ phiên mở được phòng tham vấn của mình,
 * và chỉ khi bản ghi còn Đang hiệu lực. Trả 404 thay vì 403 để không lộ phiên của người khác có tồn tại hay không.
 */
@Injectable()
export class SessionAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async loadOwned(sessionId: string, user: SessionUser, ip: string | null = null): Promise<LoadedSession> {
    const session = await this.prisma.practiceSession.findUnique({ where: { id: sessionId }, include: sessionInclude });
    if (!session || session.userId !== user.id || session.recordStatus !== 'ACTIVE') {
      if (session) {
        await this.audit.record({
          actorId: user.id,
          action: AUDIT.ACCESS_DENIED,
          entityType: 'practice_session',
          entityId: sessionId,
          ip,
        });
      }
      throw new NotFoundException('Không tìm thấy phiên thực hành');
    }
    return session;
  }
}
