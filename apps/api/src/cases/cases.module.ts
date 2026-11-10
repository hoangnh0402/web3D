import { Module } from '@nestjs/common';
import { CaseAuthoringController } from './case-authoring.controller';
import { CaseAuthoringService } from './case-authoring.service';
import { CasesController } from './cases.controller';
import { CasesService } from './cases.service';

@Module({
  controllers: [CasesController, CaseAuthoringController],
  providers: [CasesService, CaseAuthoringService],
  exports: [CasesService],
})
export class CasesModule {}
