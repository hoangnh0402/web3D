import { Module } from '@nestjs/common';
import { AssessmentModule } from '../assessment/assessment.module';
import { AssignmentsService } from './assignments.service';
import { LecturerController, MyAssignmentsController } from './lecturer.controller';
import { LecturerScopeService } from './lecturer-scope.service';
import { LecturerService } from './lecturer.service';
import { ExportService } from './export.service';

@Module({
  imports: [AssessmentModule],
  controllers: [LecturerController, MyAssignmentsController],
  providers: [LecturerService, AssignmentsService, LecturerScopeService, ExportService],
})
export class LecturerModule {}
