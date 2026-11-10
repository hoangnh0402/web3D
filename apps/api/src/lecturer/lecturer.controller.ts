import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Put, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiTags } from '@nestjs/swagger';
import {
  addStudentSchema,
  assignmentStatusSchema,
  createAssignmentSchema,
  reviewSchema,
  type CreateAssignmentInput,
  type ReviewInput,
} from '@lab-fourt/shared';
import { CurrentUser, Roles } from '../common/decorators';
import { clientIp, type SessionUser } from '../common/request';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AssignmentsService } from './assignments.service';
import { ExportService, type ExportFile } from './export.service';
import { LecturerService } from './lecturer.service';

const uuid = new ParseUUIDPipe();

/** Chức năng giảng viên, luôn giới hạn trong lớp mình phụ trách (docs/srs/02 mục 14) */
@ApiTags('lecturer')
@Roles('LECTURER')
@Controller('lecturer')
export class LecturerController {
  constructor(
    private readonly lecturer: LecturerService,
    private readonly assignments: AssignmentsService,
    private readonly exports: ExportService,
  ) {}

  /** Trả tệp CSV để trình duyệt tải về, không lưu bản sao trên máy chủ */
  private send(res: Response, file: ExportFile) {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.setHeader('Cache-Control', 'no-store');
    return file.content;
  }

  @Get('classes/:id/export')
  async exportClass(@Param('id', uuid) id: string, @CurrentUser() user: SessionUser, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.send(res, await this.exports.classStats(user.id, id, clientIp(req)));
  }

  @Get('assignments/:id/export')
  async exportAssignment(
    @Param('id', uuid) id: string,
    @CurrentUser() user: SessionUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.send(res, await this.exports.assignment(user.id, id, clientIp(req)));
  }

  @Get('classes')
  classes(@CurrentUser() user: SessionUser) {
    return this.lecturer.classes(user.id);
  }

  @Get('classes/:id/students')
  members(@Param('id', uuid) id: string, @CurrentUser() user: SessionUser) {
    return this.lecturer.members(user.id, id);
  }

  @Post('classes/:id/students')
  @HttpCode(200)
  addStudent(
    @Param('id', uuid) id: string,
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(addStudentSchema)) body: { username: string },
  ) {
    return this.lecturer.addStudent(user.id, id, body.username);
  }

  @Delete('classes/:id/students/:userId')
  @HttpCode(204)
  async removeStudent(@Param('id', uuid) id: string, @Param('userId', uuid) userId: string, @CurrentUser() user: SessionUser) {
    await this.lecturer.removeStudent(user.id, id, userId);
  }

  @Get('classes/:id/stats')
  stats(@Param('id', uuid) id: string, @CurrentUser() user: SessionUser) {
    return this.lecturer.stats(user.id, id);
  }

  @Get('assignments')
  listAssignments(@CurrentUser() user: SessionUser) {
    return this.assignments.list(user.id);
  }

  @Post('assignments')
  createAssignment(
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(createAssignmentSchema))
    body: CreateAssignmentInput & { classIds: string[]; studentIds: string[] },
  ) {
    return this.assignments.create(user.id, body);
  }

  @Get('assignments/:id')
  progress(@Param('id', uuid) id: string, @CurrentUser() user: SessionUser) {
    return this.assignments.progress(user.id, id);
  }

  @Patch('assignments/:id')
  @HttpCode(204)
  async setStatus(
    @Param('id', uuid) id: string,
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(assignmentStatusSchema)) body: { status: 'OPEN' | 'CLOSED' },
  ) {
    await this.assignments.setStatus(user.id, id, body.status);
  }

  @Get('submissions/:id')
  submission(@Param('id', uuid) id: string, @CurrentUser() user: SessionUser) {
    return this.lecturer.submission(user.id, id);
  }

  @Put('submissions/:id/review')
  review(
    @Param('id', uuid) id: string,
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(reviewSchema)) body: ReviewInput & { comment: string },
  ) {
    return this.lecturer.review(user.id, id, body);
  }
}

/** Bài được giao của sinh viên */
@ApiTags('assignments')
@Roles('STUDENT')
@Controller('assignments')
export class MyAssignmentsController {
  constructor(private readonly assignments: AssignmentsService) {}

  @Get('mine')
  mine(@CurrentUser() user: SessionUser) {
    return this.assignments.mine(user.id);
  }
}
