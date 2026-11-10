'use client';

import { useQuery } from '@tanstack/react-query';
import { ROLE_LABELS, type Role } from '@lab-fourt/shared';
import { PageHead } from '@/components/ui';
import { api } from '@/lib/api';

interface UserRow {
  id: string;
  username: string;
  fullName: string;
  role: Role;
  status: 'ACTIVE' | 'LOCKED' | 'DISABLED';
  mustChangePassword: boolean;
  lastLoginAt: string | null;
}

const STATUS: Record<UserRow['status'], string> = { ACTIVE: 'Đang hoạt động', LOCKED: 'Đã khóa', DISABLED: 'Vô hiệu hóa' };
const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString('vi-VN') : 'Chưa đăng nhập');

/** SCR-17 bản đầu: chỉ xem danh sách. Tạo, khóa, đặt lại mật khẩu làm ở nhiệm vụ sau. */
export default function AdminHome() {
  const users = useQuery({ queryKey: ['users'], queryFn: () => api<UserRow[]>('/users') });
  return (
    <>
      <PageHead title="Tài khoản" sub="Danh sách tài khoản trong hệ thống" />
      <section className="panel table-wrap" style={{ padding: 0 }}>
        {users.isPending && <p className="muted" style={{ padding: 22 }}>Đang tải...</p>}
        {users.isError && <p role="alert" style={{ padding: 22 }}>Không tải được danh sách tài khoản.</p>}
        {users.data && (
          <table className="t">
            <thead>
              <tr>
                <th scope="col">Họ tên</th>
                <th scope="col">Tên đăng nhập</th>
                <th scope="col">Vai trò</th>
                <th scope="col">Trạng thái</th>
                <th scope="col">Lần đăng nhập gần nhất</th>
              </tr>
            </thead>
            <tbody>
              {users.data.map((u) => (
                <tr key={u.id}>
                  <td>{u.fullName}</td>
                  <td>
                    <code>{u.username}</code>
                  </td>
                  <td>{ROLE_LABELS[u.role]}</td>
                  <td>
                    {STATUS[u.status]}
                    {u.mustChangePassword && <span className="muted small"> · chưa đổi mật khẩu</span>}
                  </td>
                  <td className="num">{fmt(u.lastLoginAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
