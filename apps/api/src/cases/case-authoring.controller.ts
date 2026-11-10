import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { caseEditorSchema, type CaseEditorData } from '@lab-fourt/shared';
import { CurrentUser, Roles } from '../common/decorators';
import type { SessionUser } from '../common/request';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CaseAuthoringService } from './case-authoring.service';

const uuid = new ParseUUIDPipe();
const body = new ZodValidationPipe(caseEditorSchema);

/** Tạo, sửa, sao chép, xuất bản, lưu trữ ca: chỉ giảng viên (docs/srs/02 mục 14) */
@ApiTags('lecturer-cases')
@Roles('LECTURER')
@Controller('lecturer/cases')
export class CaseAuthoringController {
  constructor(private readonly authoring: CaseAuthoringService) {}

  @Get()
  list() {
    return this.authoring.list();
  }

  @Post()
  create(@CurrentUser() user: SessionUser, @Body(body) data: CaseEditorData) {
    return this.authoring.create(user.id, data);
  }

  @Get(':id')
  get(@Param('id', uuid) id: string) {
    return this.authoring.get(id);
  }

  @Put(':id')
  save(@Param('id', uuid) id: string, @CurrentUser() user: SessionUser, @Body(body) data: CaseEditorData) {
    return this.authoring.save(user.id, id, data);
  }

  @Post(':id/publish')
  @HttpCode(200)
  publish(@Param('id', uuid) id: string, @CurrentUser() user: SessionUser) {
    return this.authoring.publish(user.id, id);
  }

  @Post(':id/copy')
  copy(@Param('id', uuid) id: string, @CurrentUser() user: SessionUser) {
    return this.authoring.copy(user.id, id);
  }

  @Post(':id/archive')
  @HttpCode(200)
  archive(@Param('id', uuid) id: string, @CurrentUser() user: SessionUser) {
    return this.authoring.setArchived(user.id, id, true);
  }

  @Post(':id/restore')
  @HttpCode(200)
  restore(@Param('id', uuid) id: string, @CurrentUser() user: SessionUser) {
    return this.authoring.setArchived(user.id, id, false);
  }
}
