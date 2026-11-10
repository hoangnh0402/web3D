import { Module } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { SessionAccessService } from './session-access.service';
import { SessionEventsService } from './session-events.service';
import { SessionLifecycleService } from './session-lifecycle.service';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { SpeechService } from './speech.service';

@Module({
  controllers: [SessionsController],
  providers: [
    SessionsService,
    ConversationService,
    SessionAccessService,
    SessionEventsService,
    SessionLifecycleService,
    SpeechService,
  ],
  exports: [SessionAccessService, SessionsService],
})
export class SessionsModule {}
