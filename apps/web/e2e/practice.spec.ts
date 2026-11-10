import { expect, test } from '@playwright/test';

const USER = { username: 'e2e_sv2', password: 'E2eThucHanh2026' };

// Ép chế độ nhẹ 2D để trình duyệt kiểm thử không dựng 3D bằng CPU (rất nặng trên máy không có GPU)
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lf.forceLite', '1'));
});

test('chọn ca, chuẩn bị, trò chuyện, thử lại khi lỗi, tải lại trang rồi kết thúc phiên', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Tên đăng nhập').fill(USER.username);
  await page.getByLabel('Mật khẩu').fill(USER.password);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page).toHaveURL(/\/student$/);

  // SCR-04 Thư viện ca
  await page.getByRole('button', { name: 'Thư viện ca' }).click();
  const card = page.locator('.case-card', { hasText: 'Áp lực học tập' });
  await card.getByRole('link', { name: 'Xem ca' }).click();

  // SCR-05 phải xác nhận quy tắc mới bắt đầu được
  const start = page.getByRole('button', { name: 'Bắt đầu phiên' });
  await expect(start).toBeDisabled();
  await page.getByLabel('Tôi đã đọc và hiểu quy tắc mô phỏng.').check();
  await start.click();
  await expect(page).toHaveURL(/\/session\/[0-9a-f-]+$/);

  // SCR-06 hướng dẫn lần đầu, nhãn mô phỏng, câu mở đầu của thân chủ
  const intro = page.getByRole('button', { name: 'Bắt đầu trò chuyện' });
  if (await intro.isVisible()) await intro.click();
  await expect(page.getByText('Môi trường mô phỏng')).toBeVisible();
  const log = page.locator('.talk-log');
  await expect(log.locator('.msg.client')).toHaveCount(1);

  const input = page.getByLabel('Nhập lời nói của bạn');
  await input.fill('Chào em, hôm nay em muốn chia sẻ điều gì?');
  await input.press('Enter');
  await expect(log.locator('.msg.student')).toHaveCount(1);
  await expect(log.locator('.msg.client')).toHaveCount(2, { timeout: 20_000 });

  // Dịch vụ AI lỗi: lời sinh viên vẫn còn, bấm Thử lại thì có phản hồi và không tạo lượt trùng
  await input.fill('Em kể thêm được không [giả lập lỗi]');
  await page.getByRole('button', { name: 'Gửi' }).click();
  const retry = page.getByRole('button', { name: 'Thử lại' });
  await expect(retry).toBeVisible({ timeout: 20_000 });
  await expect(log.locator('.msg.student')).toHaveCount(2);
  await retry.click();
  await expect(log.locator('.msg.client')).toHaveCount(3, { timeout: 20_000 });
  await expect(log.locator('.msg.student')).toHaveCount(2);

  // Tải lại trang: quay lại đúng phiên, đủ hội thoại (FR-SES-06)
  await page.reload();
  await expect(log.locator('.msg')).toHaveCount(5);

  // Chế độ nhẹ hiển thị ảnh tĩnh của phòng, hội thoại vẫn đủ (FR-3D-08)
  await expect(page.locator('.stage-2d')).toBeVisible();
  await expect(page.getByRole('button', { name: '3D', exact: true })).toBeDisabled();

  // Kết thúc phiên có bước xác nhận (FR-SES-04)
  await page.getByRole('button', { name: 'Kết thúc phiên' }).click();
  const dialog = page.getByRole('dialog', { name: 'Kết thúc phiên?' });
  await dialog.getByRole('button', { name: 'Kết thúc phiên' }).click();
  await expect(page).toHaveURL(/\/student\/history\/[0-9a-f-]+$/);
  // Báo cáo tạo ở nền bởi worker; transcript xem được ngay (FR-RPT-01, FR-RPT-08)
  await expect(page.getByRole('heading', { name: /Đang tạo báo cáo|Báo cáo:/ })).toBeVisible();
  await page.getByRole('link', { name: 'Xem transcript' }).click();
  await expect(page.locator('.msg')).toHaveCount(5);
  await page.getByRole('link', { name: '‹ Báo cáo' }).click();

  await page.getByRole('link', { name: '‹ Lịch sử thực hành' }).click();
  await expect(page.locator('table.t tbody tr').first()).toContainText('Đã kết thúc');
});
