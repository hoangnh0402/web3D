import { Global, Module } from '@nestjs/common';
import { ENV, type Env } from '../config/env';
import { AI_GATEWAY } from './ai-gateway.types';
import { HttpAiGateway } from './http-ai.gateway';
import { MockAiGateway } from './mock-ai.gateway';
import { OpenAiAiGateway } from './openai-ai.gateway';
import { SimpleAiGateway } from './simple-ai.gateway';

/** Chọn adapter: mock để kiểm thử cố định, simple cho AI local tối giản, http cho dịch vụ thật. */
@Global()
@Module({
  providers: [
    MockAiGateway,
    SimpleAiGateway,
    {
      provide: AI_GATEWAY,
      inject: [ENV, MockAiGateway, SimpleAiGateway],
      useFactory: (env: Env, mock: MockAiGateway, simple: SimpleAiGateway) => {
        if (env.AI_PROVIDER === 'mock') return mock;
        if (env.AI_PROVIDER === 'simple') return simple;
        return env.AI_PROTOCOL === 'openai' ? new OpenAiAiGateway(env, simple) : new HttpAiGateway(env);
      },
    },
  ],
  exports: [AI_GATEWAY],
})
export class AiGatewayModule {}
