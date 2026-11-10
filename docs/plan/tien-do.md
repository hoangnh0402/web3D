# Tiến độ phát triển Lab FourT

Cập nhật: 10/11/2026. Nhánh: `plan/product-nextjs-nestjs`.

Tệp này ghi lại những gì đã làm và việc tiếp theo, để phiên làm việc sau nắm ngay tình hình. Đọc kèm [AGENTS.md](../../AGENTS.md) (quy tắc) và [COPYRIGHT.md](../../COPYRIGHT.md) (công nghệ, phiên bản).

## 1. Tình trạng kiểm tra

| Lệnh | Kết quả lần cuối |
|---|---|
| `pnpm lint`, `pnpm typecheck`, `pnpm build` | Qua |
| `pnpm test` không có CSDL (`TEST_DATABASE_URL=`) | 33 bài qua, các bài tích hợp bị bỏ qua |
| Kiểm thử tích hợp API với PostgreSQL | **Chưa chạy đủ.** Các bộ của nhiệm vụ 01, 02 đã qua trước đó. Các bộ mới của nhiệm vụ 03 đến 06 chưa từng chạy với CSDL thật |
| Playwright (`apps/web/e2e`) | **Chưa chạy lại** sau nhiệm vụ 02 |

Lý do: Docker Desktop đã bị tắt nhiều lần vì máy đơ. Việc đầu tiên của phiên sau là chạy đủ các kiểm thử này (mục 4.1).

## 2. Đã làm

### Nhiệm vụ 01: Nền móng
- Monorepo pnpm: `apps/web` (Next.js 16), `apps/api` (NestJS 12, API và worker), `packages/shared` (lược đồ Zod), `deploy/`.
- Prisma 7: đủ bảng theo docs/srs/04, migration đầu tiên, seed chạy lại an toàn.
- Đăng nhập: Argon2id, phiên lưu CSDL (chỉ lưu mã băm token), cookie `HttpOnly`, bắt đổi mật khẩu lần đầu, khóa tạm khi sai nhiều lần, thu hồi phiên khi khóa tài khoản, guard vai trò, chống CSRF bằng header `X-Requested-With: lab-fourt`, nhật ký kiểm toán, log che trường nhạy cảm.
- Docker Compose với Caddy HTTPS, PostgreSQL không mở cổng, Uptime Kuma, script sao lưu.

### Nhiệm vụ 02: Phiên thực hành và hội thoại
- Thư viện ca (SCR-04), trang chuẩn bị (SCR-05), phòng tham vấn (SCR-06) theo prototype.
- Gửi lượt chống trùng bằng `clientTurnId`, SSE có phát lại theo `Last-Event-ID`, tự thử lại khi AI lỗi hoặc quá thời gian, nút Thử lại.
- Nhận dạng giọng nói (nhấn để nói, không lưu âm thanh), hết giờ tự kết thúc, lâu không hoạt động thì Bỏ dở (worker quét mỗi phút).
- Sự kiện an toàn với hướng dẫn cấu hình được.

### Nhiệm vụ 03: Báo cáo và phản tư
- Worker tạo báo cáo qua hàng đợi pg-boss, thử 3 lần, lỗi thì quản trị viên chạy lại.
- Đối chiếu dẫn chứng với transcript, loại dẫn chứng bịa và đánh dấu kỹ năng cần xem lại.
- SCR-07 báo cáo, SCR-08 transcript nhảy tới lượt, SCR-09 phản tư (lưu nháp, hoàn thành).

### Nhiệm vụ 04: Giao bài và giảng viên
- Giao bài cho lớp hoặc từng sinh viên, nộp bài cần phản tư, nộp trễ được đánh dấu.
- Sinh viên xóa mềm phiên; phiên đã nộp thì bài chuyển sang Đã rút (OI-12).
- Giảng viên: tổng quan, tiến độ, xem xét bài nộp (đánh giá riêng, không ghi đè AI), thống kê kỹ năng lớp, thêm bớt sinh viên. Không đọc được phiên luyện tự do (OI-11).

### Nhiệm vụ 05: Soạn ca
- Danh sách ca, trình soạn 8 bước, lưu nháp, xuất bản khi đủ 8 thành phần.
- Sửa ca đã xuất bản tạo phiên bản nháp mới, phiên cũ giữ phiên bản đã dùng (FR-CASE-08). Sao chép, lưu trữ, khôi phục.

### Nhiệm vụ 06: Quản trị
- Tài khoản (mật khẩu tạm hiện một lần, khóa, vô hiệu hóa, đặt lại mật khẩu, nhập CSV báo lỗi theo dòng), lớp, dữ liệu phiên (khôi phục bắt buộc đặt hạn mới), cấu hình, trạng thái hệ thống và mức dùng AI, nhật ký có lọc và phân trang.
- Script sao lưu ghi thời điểm vào `system_settings` (`backup.lastAt`).

### Thêm
- Giảng viên xuất CSV tiến độ bài và thống kê lớp (FR-LEC-06), có ghi nhật ký, chống chèn công thức Excel.
- Cân đối bố cục toàn bộ prototype demo và đồng bộ CSS sang sản phẩm: hai khối cạnh nhau cao bằng nhau, cột phụ bám theo khi cuộn, trang đăng nhập căn giữa, bảng không xuống dòng lộn xộn. Trang chủ sinh viên của sản phẩm có khối Câu hỏi phản tư.

## 3. Quyết định và giả định đã chọn (SRS chưa nêu)

- Mật khẩu tối thiểu 8 ký tự, có chữ và số. Phiên đăng nhập 12 giờ. Khóa tạm sau 5 lần sai, 15 phút (đổi được ở trang Cấu hình).
- Trạng thái duyệt nội dung ca: `PENDING`, `APPROVED`, `CHANGES_REQUESTED`. Mức an toàn thêm `LOW`, `MEDIUM`.
- Dev seed xuất bản sẵn 3 ca để thử; production để Nháp chờ giảng viên duyệt (OI-02).
- Thống kê lớp tính theo mức AI đề xuất.
- Thời gian chờ và số lần thử lại với dịch vụ AI lấy giá trị đề xuất ở docs/srs/07 mục 7 (chờ thống nhất).

## 4. Việc tiếp theo

### 4.1. Chạy và sửa kiểm thử (ưu tiên cao nhất)
1. Bật Docker Desktop, chạy `docker compose -f deploy/compose.dev.yaml up -d --wait`.
2. `pnpm test` đầy đủ (có `TEST_DATABASE_URL`). Sửa lỗi ở các bộ `assessment`, `lecturer`, `case-authoring`, `admin`.
3. `pnpm build` rồi `PLAYWRIGHT_CHANNEL=msedge pnpm e2e`. Kịch bản thực hành đã ép chế độ 2D.
4. Chạy thử toàn hệ thống bằng `deploy/compose.yaml`.

### 4.2. Chức năng còn thiếu
- Adapter AI thật (`AI_PROVIDER=http`): chờ bên AI có điểm cuối, theo hợp đồng docs/srs/07.
- Quy trình xử lý sự kiện an toàn và chuyển cho giảng viên (FR-SAFE-04): chờ OI-03.
- Quản trị viên xuất báo cáo (ma trận phân quyền cho phép, chưa làm).
- Giảng viên thực hành để thử ca: API đã cho phép, chưa có giao diện.

### 4.3. Tài liệu và hoàn thiện
- Cập nhật docs/srs/06 (frontend là Next.js) và ghi quyết định vào docs/srs/09.
- Kiểm tra giao diện ở khổ điện thoại và máy tính bảng.
- Thử tải 50 phiên với k6, thử khôi phục từ bản sao lưu (NFR-BAK-04).

## 5. Lưu ý khi làm việc trên máy này

- **pnpm:** máy có pnpm 10, không tự chuyển sang 12.18. Dùng `npx -y pnpm@12.18.0 <lệnh>`.
- **Máy dễ đơ:** không chạy Playwright vẽ 3D (SwiftShader dùng CPU). Kịch bản kiểm thử đặt `localStorage['lf.forceLite']='1'` để ép chế độ 2D. Chỉ bật Docker khi cần.
- **Prisma:** `prisma migrate reset` bị chặn khi agent chạy nếu chưa có xác nhận của chủ dự án. Không lách qua.
- **Ghi tệp:** công cụ ghi tệp tự đổi chuỗi `\uXXXX` thành ký tự thật (gây lỗi lint `no-irregular-whitespace`). Dùng `String.fromCharCode(...)` hoặc `\p{...}`.
- **Kết nối API:** API đặt `keepAliveTimeout` 65 giây để proxy của Next không báo `ECONNRESET`.
- **Tài khoản dev:** `admin` / giá trị `SEED_ADMIN_PASSWORD`; `giangvien`, `sinhvien1`, `sinhvien2` / `LabFourT2026`. Kiểm thử đầu cuối dùng `e2e_sv`, `e2e_sv2` (đặt lại tự động).
