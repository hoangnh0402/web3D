import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from '@/lib/api';
import { LoginForm } from './login-form';

describe('LoginForm', () => {
  it('báo lỗi từng trường khi bỏ trống và không gửi', async () => {
    const onSubmit = vi.fn();
    render(<LoginForm onSubmit={onSubmit} pending={false} />);
    await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
    expect(await screen.findByText('Vui lòng nhập tên đăng nhập')).toBeInTheDocument();
    expect(screen.getByText('Vui lòng nhập mật khẩu')).toBeInTheDocument();
    expect(screen.getByLabelText('Tên đăng nhập')).toHaveAttribute('aria-invalid', 'true');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('gửi tên đăng nhập đã cắt khoảng trắng', async () => {
    const onSubmit = vi.fn();
    render(<LoginForm onSubmit={onSubmit} pending={false} />);
    await userEvent.type(screen.getByLabelText('Tên đăng nhập'), '  sinhvien1 ');
    await userEvent.type(screen.getByLabelText('Mật khẩu'), 'MatKhau2026');
    await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
    expect(onSubmit).toHaveBeenCalledWith({ username: 'sinhvien1', password: 'MatKhau2026', remember: false, portal: 'STUDENT' }, expect.anything());
  });

  it('gửi kèm lựa chọn Ghi nhớ đăng nhập và hiện số ngày theo cấu hình', async () => {
    const onSubmit = vi.fn();
    render(<LoginForm onSubmit={onSubmit} pending={false} options={{ registrationEnabled: false, rememberDays: 7 }} />);
    expect(screen.getByText(/Giữ đăng nhập 7 ngày/)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Tên đăng nhập'), 'sinhvien1');
    await userEvent.type(screen.getByLabelText('Mật khẩu'), 'MatKhau2026');
    await userEvent.click(screen.getByRole('checkbox', { name: /Ghi nhớ đăng nhập/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ remember: true }), expect.anything());
  });

  it('có liên kết Quên mật khẩu; liên kết Đăng ký chỉ hiện khi quản trị viên mở đăng ký', () => {
    const { rerender } = render(<LoginForm onSubmit={vi.fn()} pending={false} options={{ registrationEnabled: false, rememberDays: 30 }} />);
    expect(screen.getByRole('link', { name: 'Quên mật khẩu?' })).toHaveAttribute('href', '/forgot-password');
    expect(screen.queryByRole('link', { name: /Đăng ký/ })).not.toBeInTheDocument();
    rerender(<LoginForm onSubmit={vi.fn()} pending={false} options={{ registrationEnabled: true, rememberDays: 30 }} />);
    expect(screen.getByRole('link', { name: 'Đăng ký tài khoản sinh viên' })).toHaveAttribute('href', '/register');
  });

  it('trang quản trị gửi kèm vai trò, không có đăng ký, và chỉ đường khi đăng nhập nhầm trang', async () => {
    const onSubmit = vi.fn();
    const wrong = new ApiRequestError(403, 'Đây là tài khoản sinh viên.', undefined, { portal: '/login' });
    render(<LoginForm portal="ADMIN" onSubmit={onSubmit} pending={false} error={wrong} options={{ registrationEnabled: true, rememberDays: 30 }} />);
    expect(screen.queryByRole('link', { name: /Đăng ký/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Đến trang đăng nhập đúng' })).toHaveAttribute('href', '/login');
    await userEvent.type(screen.getByLabelText('Tên đăng nhập'), 'admin');
    await userEvent.type(screen.getByLabelText('Mật khẩu'), 'MatKhau2026');
    await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ portal: 'ADMIN' }), expect.anything());
  });

  it('khóa nút và đổi nhãn khi đang gửi', () => {
    render(<LoginForm onSubmit={vi.fn()} pending />);
    const button = screen.getByRole('button', { name: 'Đang đăng nhập...' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('hiện thông báo lỗi từ máy chủ', () => {
    render(<LoginForm onSubmit={vi.fn()} pending={false} error={new ApiRequestError(401, 'Tên đăng nhập hoặc mật khẩu không đúng')} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Tên đăng nhập hoặc mật khẩu không đúng');
  });
});
