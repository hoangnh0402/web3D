import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminController } from './admin.controller';
import { AdminDataService } from './admin-data.service';
import { AdminUsersService } from './admin-users.service';

@Module({
  imports: [AuthModule],
  controllers: [AdminController],
  providers: [AdminUsersService, AdminDataService],
})
export class AdminModule {}
