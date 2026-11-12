import { Global, Module } from '@nestjs/common';
import { ENV, type Env } from '../config/env';
import { AI_GATEWAY } from './ai-gateway.types';
import { HttpAiGateway } from './http-ai.gateway';
import { MockAiGateway } from './mock-ai.gateway';

/** Chọn adapter theo AI_PROVIDER: mock là dịch vụ giả lập, http là dịch vụ thật theo docs/srs/07 */
@Global()
@Module({
  providers: [
    MockAiGateway,
    {
      provide: AI_GATEWAY,
      inject: [ENV, MockAiGateway],
      useFactory: (env: Env, mock: MockAiGateway) => (env.AI_PROVIDER === 'mock' ? mock : new HttpAiGateway(env)),
    },
  ],
  exports: [AI_GATEWAY],
})
export class AiGatewayModule {}
