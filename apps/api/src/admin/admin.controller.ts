import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  classMembersSchema,
  classSchema,
  classStatusSchema,
  createUserSchema,
  importUsersSchema,
  recordStatusSchema,
  updateSettingsSchema,
  updateUserSchema,
  type ClassInput,
  type CreateUserInput,
  type RecordStatusInput,
  type SystemSettings,
  type UpdateUserInput,
} from '@lab-fourt/shared';
import { CurrentUser, Roles } from '../common/decorators';
import type { SessionUser } from '../common/request';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import type { RecordStatus } from '../generated/prisma/client';
import { AdminDataService } from './admin-data.service';
import { AdminUsersService } from './admin-users.service';

const uuid = new ParseUUIDPipe();
const pipe = <T,>(schema: ConstructorParameters<typeof ZodValidationPipe<T>>[0]) => new ZodValidationPipe<T>(schema);

/** Trang quản trị: tài khoản, lớp, dữ liệu, cấu hình, trạng thái, nhật ký (FR-ADM-01) */
@ApiTags('admin')
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly users: AdminUsersService,
    private readonly data: AdminDataService,
  ) {}

  // ---------- Tài khoản ----------

  @Get('users')
  listUsers(@Query('q') q?: string) {
    return this.users.list(q);
  }

  @Post('users')
  createUser(@CurrentUser() user: SessionUser, @Body(pipe(createUserSchema)) body: CreateUserInput) {
    return this.users.create(user.id, body);
  }

  @Post('users/import')
  @HttpCode(200)
  importUsers(@CurrentUser() user: SessionUser, @Body(pipe(importUsersSchema)) body: { csv: string }) {
    return this.users.importCsv(user.id, body.csv);
  }

  @Patch('users/:id')
  updateUser(@Param('id', uuid) id: string, @CurrentUser() user: SessionUser, @Body(pipe(updateUserSchema)) body: UpdateUserInput) {
    return this.users.update(user.id, id, body);
  }

  @Post('users/:id/reset-password')
  @HttpCode(200)
  resetPassword(@Param('id', uuid) id: string, @CurrentUser() user: SessionUser) {
    return this.users.resetPassword(user.id, id);
  }

  // ---------- Yêu cầu quên mật khẩu (FR-AUTH-04) ----------

  @Get('password-requests')
  passwordRequests() {
    return this.users.passwordRequests();
  }

  @Post('password-requests/:id/resolve')
  @HttpCode(200)
  resolvePasswordRequest(@Param('id', uuid) id: string, @CurrentUser() user: SessionUser) {
    return this.users.resolvePasswordRequest(user.id, id);
  }

  @Post('password-requests/:id/dismiss')
  @HttpCode(204)
  async dismissPasswordRequest(@Param('id', uuid) id: string, @CurrentUser() user: SessionUser) {
    await this.users.dismissPasswordRequest(user.id, id);
  }

  // ---------- Lớp ----------

  @Get('classes')
  classes() {
    return this.data.classes();
  }

  @Post('classes')
  async createClass(@CurrentUser() user: SessionUser, @Body(pipe(classSchema)) body: ClassInput & { term: string }) {
    return { id: await this.data.saveClass(user.id, body) };
  }

  @Put('classes/:id')
  async updateClass(@Param('id', uuid) id: string, @CurrentUser() user: SessionUser, @Body(pipe(classSchema)) body: ClassInput & { term: string }) {
    return { id: await this.data.saveClass(user.id, body, id) };
  }

  @Patch('classes/:id/status')
  @HttpCode(204)
  async classStatus(@Param('id', uuid) id: string, @CurrentUser() user: SessionUser, @Body(pipe(classStatusSchema)) body: { status: 'ACTIVE' | 'ARCHIVED' }) {
    await this.data.setClassStatus(user.id, id, body.status);
  }

  @Post('classes/:id/members')
  @HttpCode(200)
  setMembers(
    @Param('id', uuid) id: string,
    @CurrentUser() user: SessionUser,
    @Body(pipe(classMembersSchema)) body: { lecturerIds?: string[]; studentUsernames?: string[] },
  ) {
    return this.data.setMembers(user.id, id, body);
  }

  @Delete('classes/:id/members/:userId')
  @HttpCode(204)
  async removeMember(@Param('id', uuid) id: string, @Param('userId', uuid) userId: string, @CurrentUser() user: SessionUser) {
    await this.data.removeMember(user.id, id, userId);
  }

  // ---------- Dữ liệu phiên ----------

  @Get('sessions')
  sessions(@Query('recordStatus') recordStatus?: string, @Query('q') q?: string) {
    const status = ['ACTIVE', 'ARCHIVED', 'DELETED'].includes(recordStatus ?? '') ? (recordStatus as RecordStatus) : undefined;
    return this.data.sessions({ recordStatus: status, q });
  }

  @Patch('sessions/:id/record-status')
  @HttpCode(204)
  async setRecordStatus(@Param('id', uuid) id: string, @CurrentUser() user: SessionUser, @Body(pipe(recordStatusSchema)) body: RecordStatusInput) {
    await this.data.setRecordStatus(user.id, id, body);
  }

  // ---------- Cấu hình, trạng thái, nhật ký ----------

  @Get('settings')
  settings() {
    return this.data.settings();
  }

  @Put('settings')
  updateSettings(@CurrentUser() user: SessionUser, @Body(pipe(updateSettingsSchema)) body: Partial<SystemSettings>) {
    return this.data.updateSettings(user.id, body);
  }

  @Get('status')
  status() {
    return this.data.status();
  }

  @Get('audit')
  audit(
    @Query('action') action?: string,
    @Query('actor') actor?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
  ) {
    const valid = (d?: string) => (d && !Number.isNaN(Date.parse(d)) ? d : undefined);
    return this.data.auditLog({ action, actor, from: valid(from), to: valid(to), page: Number(page) || 1 });
  }
}
