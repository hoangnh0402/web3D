import { expect, test } from '@playwright/test';

const USER = { username: 'e2e_sv', password: 'E2eBanDau2026', next: 'E2eMatKhauMoi2026' };

test('đăng nhập, đổi mật khẩu lần đầu, mở phòng 3D rồi đăng xuất', async ({ page }) => {
  // Chưa đăng nhập thì bị chuyển về trang đăng nhập
  await page.goto('/student');
  await expect(page).toHaveURL(/\/login$/);

  await page.getByLabel('Tên đăng nhập').fill(USER.username);
  await page.getByLabel('Mật khẩu').fill('SaiMatKhau1');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page.locator('.notice').getByText('Tên đăng nhập hoặc mật khẩu không đúng')).toBeVisible();

  await page.getByLabel('Mật khẩu').fill(USER.password);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();

  // Lần đầu đăng nhập phải đặt mật khẩu mới
  await expect(page).toHaveURL(/\/change-password$/);
  await page.getByLabel('Mật khẩu hiện tại').fill(USER.password);
  await page.getByLabel('Mật khẩu mới', { exact: true }).fill(USER.next);
  await page.getByLabel('Nhập lại mật khẩu mới').fill(USER.next);
  await page.getByRole('button', { name: 'Lưu và tiếp tục' }).click();

  await expect(page).toHaveURL(/\/student$/);
  await expect(page.getByRole('heading', { name: /Xin chào, Sinh viên kiểm thử/ })).toBeVisible();

  // Sinh viên không vào được trang quản trị: giao diện đưa về trang của mình, API trả 403
  const res = await page.request.get('/api/users');
  expect(res.status()).toBe(403);
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/student$/);

  // Phòng 3D hiển thị canvas WebGL và nhân vật tải xong
  await page.getByRole('button', { name: 'Xem thử phòng 3D' }).click();
  await expect(page).toHaveURL(/\/student\/room-preview$/);
  const room = page.getByTestId('room-preview');
  await expect(room.locator('canvas')).toBeVisible({ timeout: 30_000 });
  await expect(room.locator('.scene-wrap[data-ready]')).toBeVisible({ timeout: 60_000 });

  await page.getByRole('button', { name: 'Đăng xuất' }).click();
  await expect(page).toHaveURL(/\/login$/);
  const after = await page.request.get('/api/auth/me');
  expect(after.status()).toBe(401);
});
