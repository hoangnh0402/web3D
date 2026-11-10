import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators';
import type { SessionUser } from '../common/request';
import { CasesService } from './cases.service';

/** Mọi vai trò xem được ca đã xuất bản (docs/srs/02 mục 14) */
@ApiTags('cases')
@Controller('cases')
export class CasesController {
  constructor(private readonly cases: CasesService) {}

  @Get()
  list(@CurrentUser() user: SessionUser) {
    return this.cases.listPublished(user.id);
  }

  @Get(':id')
  get(@Param('id', new ParseUUIDPipe()) id: string, @CurrentUser() user: SessionUser) {
    return this.cases.getPublished(id, user.id);
  }
}
