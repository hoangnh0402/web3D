import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PublicHeader } from './PublicHeader';

const renderHeader = (me: unknown) => {
  // Chưa đăng nhập thì /auth/me trả 401
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      me
        ? new Response(JSON.stringify(me), { status: 200, headers: { 'Content-Type': 'application/json' } })
        : new Response(JSON.stringify({ statusCode: 401, message: 'Chưa đăng nhập' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          }),
    ),
  );
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <PublicHeader />
    </QueryClientProvider>,
  );
};

afterEach(() => vi.unstubAllGlobals());

describe('PublicHeader', () => {
  it('nút Đăng nhập mở ba lựa chọn vai trò, nhấn Esc thì đóng', async () => {
    renderHeader(null);
    const button = await screen.findByRole('button', { name: /Đăng nhập/ });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: /Sinh viên/ })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: /Giảng viên/ })).toHaveAttribute('href', '/login/giang-vien');
    expect(screen.getByRole('link', { name: /Quản trị viên/ })).toHaveAttribute('href', '/login/quan-tri');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('link', { name: /Quản trị viên/ })).not.toBeInTheDocument());
  });

  it('đã đăng nhập thì thay bằng nút vào trang của mình', async () => {
    renderHeader({
      id: '01a1c484-c698-744f-9e8f-227717fcc001',
      username: 'gv',
      fullName: 'Giảng viên',
      role: 'LECTURER',
      mustChangePassword: false,
    });
    expect(await screen.findByRole('link', { name: /Vào trang của tôi/ })).toHaveAttribute('href', '/lecturer');
    expect(screen.queryByRole('button', { name: /Đăng nhập/ })).not.toBeInTheDocument();
  });
});
