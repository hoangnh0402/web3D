import { Controller, Get, NotFoundException, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators';
import { PrismaService } from '../prisma/prisma.service';

const PUBLIC_FIELDS = {
  id: true,
  username: true,
  fullName: true,
  role: true,
  status: true,
  mustChangePassword: true,
  lastLoginAt: true,
  createdAt: true,
} as const;

/** Quản lý tài khoản chỉ dành cho quản trị viên (docs/srs/02 mục 14). Nhiệm vụ này mới làm phần đọc. */
@ApiTags('users')
@Roles('ADMIN')
@Controller('users')
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.user.findMany({ select: PUBLIC_FIELDS, orderBy: [{ role: 'asc' }, { username: 'asc' }] });
  }

  @Get(':id')
  async get(@Param('id', new ParseUUIDPipe()) id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: PUBLIC_FIELDS });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản');
    return user;
  }
}
