import { Global, Module } from '@nestjs/common';
import { QueueClientService } from './queue-client.service';
import { ASSESSMENT_QUEUE } from './queues';

/** Hàng đợi phía API: chỉ gửi việc cho worker */
@Global()
@Module({
  providers: [QueueClientService, { provide: ASSESSMENT_QUEUE, useExisting: QueueClientService }],
  exports: [ASSESSMENT_QUEUE],
})
export class QueueModule {}
