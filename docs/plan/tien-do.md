# Tiến độ phát triển Lab FourT

Cập nhật: 12/11/2026. Nhánh: `main`. Nhiệm vụ 07 đã commit và push lên `origin/main` theo yêu cầu của chủ dự án.

Tệp này ghi lại những gì đã làm và việc tiếp theo, để phiên làm việc sau nắm ngay tình hình. Đọc kèm [AGENTS.md](../../AGENTS.md) (quy tắc) và [COPYRIGHT.md](../../COPYRIGHT.md) (công nghệ, phiên bản).

## 1. Tình trạng kiểm tra

| Lệnh | Kết quả lần cuối (12/11/2026) |
|---|---|
| `pnpm lint`, `pnpm typecheck`, `pnpm build` | Qua |
| `pnpm test` có PostgreSQL (`TEST_DATABASE_URL`) | Qua: 80 bài API (gồm tích hợp), 4 bài web, 8 bài shared |
| Playwright (`PLAYWRIGHT_CHANNEL=msedge pnpm e2e`) | Qua 2 kịch bản, chạy tuần tự (`workers: 1`) |
| Toàn hệ thống bằng `deploy/compose.yaml` | **Chưa chạy.** Agent bị chặn vì được xếp là triển khai; chủ dự án tự chạy khi muốn |

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

### Nhiệm vụ 07: Xác minh và adapter dịch vụ thật
- Sửa bản giả lập lỗi báo cáo: lỗi cả 3 lần thử của lần tạo đầu, nên báo cáo chuyển Lỗi đúng như AT-05.
- Playwright chạy tuần tự. Hai tệp chạy song song làm phòng 3D dựng bằng CPU chiếm hết máy, kịch bản kia bị treo.
- Kiểm thử tích hợp mới `data-lifecycle`: AT-10 (giảng viên phụ trách vẫn không mở được phiên luyện tự do), AT-13 (xóa mềm rồi khôi phục), AT-14 (quá hạn thì Đã lưu trữ, dữ liệu còn nguyên).
- Adapter `AI_PROVIDER=http` theo docs/srs/07: SSE hoặc JSON một lần, đánh giá, STT multipart, `/health`. Phân loại lỗi theo mục 7 (400, 401 không thử lại; 429 chờ `Retry-After`; 408, 5xx, mất kết nối thử lại). Có kiểm thử với máy chủ HTTP giả.
- `STT_BASE_URL`, `STT_API_KEY` tùy chọn khi STT chạy riêng. Trang trạng thái và `/api/health` có thêm trạng thái STT.
- Biến môi trường để trống (Compose truyền `AI_BASE_URL=`) được coi như chưa đặt. Trước đây API dừng ngay khi khởi động bằng Compose.

### Thêm
- Giảng viên xuất CSV tiến độ bài và thống kê lớp (FR-LEC-06), có ghi nhật ký, chống chèn công thức Excel.
- Cân đối bố cục toàn bộ prototype demo và đồng bộ CSS sang sản phẩm: hai khối cạnh nhau cao bằng nhau, cột phụ bám theo khi cuộn, trang đăng nhập căn giữa, bảng không xuống dòng lộn xộn. Trang chủ sinh viên của sản phẩm có khối Câu hỏi phản tư.

## 3. Quyết định và giả định đã chọn (SRS chưa nêu)

- Mật khẩu tối thiểu 8 ký tự, có chữ và số. Phiên đăng nhập 12 giờ. Khóa tạm sau 5 lần sai, 15 phút (đổi được ở trang Cấu hình).
- Trạng thái duyệt nội dung ca: `PENDING`, `APPROVED`, `CHANGES_REQUESTED`. Mức an toàn thêm `LOW`, `MEDIUM`.
- Dev seed xuất bản sẵn 3 ca để thử; production để Nháp chờ giảng viên duyệt (OI-02).
- Thống kê lớp tính theo mức AI đề xuất.
- Thời gian chờ và số lần thử lại với dịch vụ AI lấy giá trị đề xuất ở docs/srs/07 mục 7 (chờ thống nhất).
- Adapter `http`: chờ theo `Retry-After` tối đa 30 giây để không vượt thời gian chờ cả lượt. Lỗi 403 xử lý như 401 (sai khóa, không thử lại). Phản hồi sai cấu trúc được thử lại như lỗi dịch vụ.
- Dịch vụ trả cảm xúc ngoài danh sách thì bỏ qua (nhân vật về trung tính); trả kỹ năng ngoài rubric thì bỏ kỹ năng đó, không làm hỏng cả báo cáo.
- STT mặc định dùng chung địa chỉ và khóa với AI. Chỉ đặt `STT_BASE_URL`, `STT_API_KEY` khi bên AI tách riêng dịch vụ STT.
- Trang trạng thái giữ 4 ô như prototype: ô "Dịch vụ AI và STT" báo lỗi khi một trong hai ngừng và ghi rõ dịch vụ nào.

## 4. Việc tiếp theo

### 4.1. Chạy thử toàn hệ thống (chủ dự án tự chạy)
- `docker compose -f deploy/compose.yaml --env-file deploy/.env up -d --build`, rồi đi tay AT-01 qua `https://localhost`.

### 4.2. Chức năng còn thiếu
- Nối adapter `http` với dịch vụ AI thật khi bên AI có điểm cuối, chạy một phiên đầu cuối rồi chốt docs/srs/07.
- Quy trình xử lý sự kiện an toàn và chuyển cho giảng viên (FR-SAFE-04): chờ OI-03.
- Quản trị viên xuất báo cáo (ma trận phân quyền cho phép, chưa làm).
- Giảng viên thực hành để thử ca: API đã cho phép, chưa có giao diện.

### 4.3. Thiết bị thật (cần người làm trên máy chủ và điện thoại)
- HTTPS nội bộ và micro trên iPad, iPhone, Android (AT-02, AT-03); đo FPS phòng 3D (AT-07, AT-08); ngắt internet (AT-20).

### 4.4. Tài liệu và hoàn thiện
- Cập nhật docs/srs/06 (frontend là Next.js) và ghi quyết định vào docs/srs/09.
- Kiểm tra giao diện ở khổ điện thoại và máy tính bảng.
- Thử tải 50 phiên với k6, thử khôi phục từ bản sao lưu (NFR-BAK-04).

## 5. Lưu ý khi làm việc trên máy này

- **pnpm:** máy có pnpm 10, không tự chuyển sang 12.18. Dùng `npx -y pnpm@12.18.0 <lệnh>`.
- **Máy dễ đơ:** không chạy Playwright vẽ 3D (SwiftShader dùng CPU). Kịch bản kiểm thử đặt `localStorage['lf.forceLite']='1'` để ép chế độ 2D. Chỉ bật Docker khi cần.
- **Playwright chạy tuần tự** (`workers: 1`). Không bỏ dòng này: hai tệp chạy song song thì kịch bản dựng 3D chiếm hết CPU và kịch bản kia treo ở bước chuyển trang.
- **Kiểm thử tích hợp dùng chung một CSDL** và các tệp chạy song song. Bài nào quét toàn bảng (ví dụ `RetentionService.archiveExpired`) phải chọn mốc thời gian không đụng tới dữ liệu của tệp khác.
- **Compose:** agent bị chặn chạy `deploy/compose.yaml` (xếp là triển khai). Chủ dự án tự chạy.
- **Prisma:** `prisma migrate reset` bị chặn khi agent chạy nếu chưa có xác nhận của chủ dự án. Không lách qua.
- **Ghi tệp:** công cụ ghi tệp tự đổi chuỗi `\uXXXX` thành ký tự thật (gây lỗi lint `no-irregular-whitespace`). Dùng `String.fromCharCode(...)` hoặc `\p{...}`.
- **Kết nối API:** API đặt `keepAliveTimeout` 65 giây để proxy của Next không báo `ECONNRESET`.
- **Tài khoản dev:** `admin` / giá trị `SEED_ADMIN_PASSWORD`; `giangvien`, `sinhvien1`, `sinhvien2` / `LabFourT2026`. Kiểm thử đầu cuối dùng `e2e_sv`, `e2e_sv2` (đặt lại tự động).
