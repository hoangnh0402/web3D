import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  Sse,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import {
  renderModeSchema,
  startSessionSchema,
  submitSchema,
  turnSchema,
  type RenderMode,
  type StartSessionInput,
  type TurnInput,
} from '@lab-fourt/shared';
import { CurrentUser, Roles } from '../common/decorators';
import { clientIp, type SessionUser } from '../common/request';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ConversationService } from './conversation.service';
import { SessionAccessService } from './session-access.service';
import { SessionEventsService } from './session-events.service';
import { SessionsService } from './sessions.service';
import { AUDIO_MAX_BYTES, SpeechService, type UploadedAudio } from './speech.service';

const uuid = new ParseUUIDPipe();

/** Sinh viên thực hành; giảng viên được thực hành để thử ca (docs/srs/02 mục 14) */
@ApiTags('sessions')
@Roles('STUDENT', 'LECTURER')
@Controller('sessions')
export class SessionsController {
  constructor(
    private readonly sessions: SessionsService,
    private readonly conversation: ConversationService,
    private readonly speech: SpeechService,
    private readonly access: SessionAccessService,
    private readonly events: SessionEventsService,
  ) {}

  @Post()
  start(
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(startSessionSchema)) body: StartSessionInput & { acceptedRules: true },
  ) {
    return this.sessions.start(user, body);
  }

  @Get()
  list(@CurrentUser() user: SessionUser) {
    return this.sessions.list(user);
  }

  /** Phiên chưa kết thúc để trang chủ đề nghị quay lại */
  @Get('active')
  async active(@CurrentUser() user: SessionUser) {
    return { session: await this.sessions.findActive(user.id) };
  }

  @Get(':id')
  get(@Param('id', uuid) id: string, @CurrentUser() user: SessionUser, @Req() req: Request) {
    return this.sessions.get(id, user, clientIp(req));
  }

  /** Giới hạn tần suất gửi lượt (NFR-SEC-05) */
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post(':id/turns')
  @HttpCode(202)
  turn(
    @Param('id', uuid) id: string,
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(turnSchema)) body: TurnInput,
  ) {
    return this.conversation.submit(id, user, body);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post(':id/speech')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('audio', { limits: { fileSize: AUDIO_MAX_BYTES, files: 1 } }))
  transcribe(@Param('id', uuid) id: string, @CurrentUser() user: SessionUser, @UploadedFile() file?: UploadedAudio) {
    return this.speech.transcribe(id, user, file);
  }

  @Post(':id/end')
  @HttpCode(200)
  end(@Param('id', uuid) id: string, @CurrentUser() user: SessionUser) {
    return this.sessions.end(id, user, 'USER');
  }

  @Post(':id/submit')
  @HttpCode(200)
  submit(
    @Param('id', uuid) id: string,
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(submitSchema)) body: { assignmentId: string },
  ) {
    return this.sessions.submit(id, user, body.assignmentId);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', uuid) id: string, @CurrentUser() user: SessionUser) {
    await this.sessions.remove(id, user);
  }

  @Patch(':id')
  @HttpCode(204)
  async setRenderMode(
    @Param('id', uuid) id: string,
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(renderModeSchema)) body: { renderMode: RenderMode },
  ) {
    await this.sessions.setRenderMode(id, user, body.renderMode);
  }

  /** Luồng SSE của phiên. Trình duyệt kết nối lại tự gửi Last-Event-ID để nhận bù sự kiện đã lỡ. */
  @Sse(':id/events')
  async stream(@Param('id', uuid) id: string, @CurrentUser() user: SessionUser, @Req() req: Request) {
    await this.access.loadOwned(id, user, clientIp(req));
    return this.events.stream(id, req.get('last-event-id'));
  }
}
