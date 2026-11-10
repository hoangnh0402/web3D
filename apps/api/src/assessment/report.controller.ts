import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { reflectionSchema, type ReflectionInput } from '@lab-fourt/shared';
import { CurrentUser, Roles } from '../common/decorators';
import type { SessionUser } from '../common/request';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ReportService } from './report.service';

const uuid = new ParseUUIDPipe();

@ApiTags('reports')
@Controller()
export class ReportController {
  constructor(private readonly reports: ReportService) {}

  /** Báo cáo của phiên mình (SCR-07). Giảng viên xem bài nộp ở nhiệm vụ giảng viên. */
  @Roles('STUDENT', 'LECTURER')
  @Get('sessions/:id/report')
  report(@Param('id', uuid) id: string, @CurrentUser() user: SessionUser) {
    return this.reports.report(id, user);
  }

  @Roles('STUDENT', 'LECTURER')
  @Get('sessions/:id/reflection')
  reflection(@Param('id', uuid) id: string, @CurrentUser() user: SessionUser) {
    return this.reports.getReflection(id, user);
  }

  @Roles('STUDENT', 'LECTURER')
  @Put('sessions/:id/reflection')
  saveReflection(
    @Param('id', uuid) id: string,
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(reflectionSchema)) body: ReflectionInput & { submit: boolean; nextGoal: string },
  ) {
    return this.reports.saveReflection(id, user, body);
  }

  /** FR-RPT-02: chỉ quản trị viên chạy lại báo cáo lỗi */
  @Roles('ADMIN')
  @Post('assessments/:sessionId/rerun')
  @HttpCode(202)
  rerun(@Param('sessionId', uuid) sessionId: string, @CurrentUser() user: SessionUser) {
    return this.reports.rerun(sessionId, user.id);
  }
}
