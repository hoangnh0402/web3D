import { Global, Module, NotImplementedException } from '@nestjs/common';
import { ENV, type Env } from '../config/env';
import { AI_GATEWAY } from './ai-gateway.types';
import { MockAiGateway } from './mock-ai.gateway';

/** Chọn adapter theo AI_PROVIDER. Adapter http sẽ làm khi dịch vụ thật có điểm cuối đầu tiên. */
@Global()
@Module({
  providers: [
    MockAiGateway,
    {
      provide: AI_GATEWAY,
      inject: [ENV, MockAiGateway],
      useFactory: (env: Env, mock: MockAiGateway) => {
        if (env.AI_PROVIDER === 'mock') return mock;
        throw new NotImplementedException('Adapter AI qua HTTP chưa được xây dựng');
      },
    },
  ],
  exports: [AI_GATEWAY],
})
export class AiGatewayModule {}
