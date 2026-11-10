import { Module } from '@nestjs/common';
import { SessionsModule } from '../sessions/sessions.module';
import { AssessmentService } from './assessment.service';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';

@Module({
  imports: [SessionsModule],
  controllers: [ReportController],
  providers: [AssessmentService, ReportService],
  exports: [AssessmentService, ReportService],
})
export class AssessmentModule {}
