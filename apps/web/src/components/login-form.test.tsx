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
    expect(onSubmit).toHaveBeenCalledWith({ username: 'sinhvien1', password: 'MatKhau2026' }, expect.anything());
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
